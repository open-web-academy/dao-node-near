// The wallet SDKs (Meteor's ConnectedMeteorWalletAccount and near-api-js's
// ConnectedWalletAccount) call `view_access_key_list` when signing, to pick
// the key (and nonce) the transaction is built with. NEAR RPC now rejects that
// query with TOO_MANY_ACCESS_KEYS for accounts holding more than 100 keys,
// which aborts signing before the wallet is even opened.
//
// When that happens we rebuild a partial list from the keys the wallet told
// us about at sign-in (`allKeys` in the `*_wallet_auth_key` localStorage entry
// both SDKs write), looking each one up with `view_access_key`, which has no
// such limit. The SDKs only ever search the list for those keys anyway.
//
// The SDKs resolve `global.fetch` at call time, so patching it once is enough.

let installed = false;

export function installAccessKeyListShim(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const res = await originalFetch(input, init);
    const req = parseAccessKeyListQuery(init?.body);
    if (!req) return res;

    let json: RpcResponse;
    try {
      json = await res.clone().json();
    } catch {
      return res;
    }
    if (json?.error?.cause?.name !== "TOO_MANY_ACCESS_KEYS") return res;

    const accountId = req.params.account_id;
    const keys = await Promise.all(
      knownPublicKeys(accountId).map(async (publicKey) => {
        const accessKey = await viewAccessKey(originalFetch, input, accountId, publicKey);
        return accessKey ? { public_key: publicKey, access_key: accessKey } : null;
      }),
    );

    const info = json.error.cause.info ?? {};
    const body = {
      jsonrpc: "2.0",
      id: json.id,
      result: {
        keys: keys.filter((k) => k !== null),
        block_hash: info.block_hash,
        block_height: info.block_height,
      },
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

interface AccessKeyListQuery {
  method: "query";
  params: { request_type: "view_access_key_list"; account_id: string };
}

function parseAccessKeyListQuery(body: BodyInit | null | undefined): AccessKeyListQuery | null {
  if (typeof body !== "string" || !body.includes("view_access_key_list")) return null;
  try {
    const req = JSON.parse(body);
    if (req?.method !== "query" || req?.params?.request_type !== "view_access_key_list") return null;
    return typeof req.params.account_id === "string" ? req : null;
  } catch {
    return null;
  }
}

// Public keys the wallets stored for this account at sign-in.
function knownPublicKeys(accountId: string): string[] {
  const keys = new Set<string>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const name = window.localStorage.key(i);
      if (!name?.endsWith("_wallet_auth_key")) continue;
      const auth = JSON.parse(window.localStorage.getItem(name) ?? "null");
      if (auth?.accountId !== accountId) continue;
      for (const k of auth.allKeys ?? []) if (typeof k === "string") keys.add(k);
      const signedIn = auth.signedInContract?.public_key;
      if (typeof signedIn === "string") keys.add(signedIn);
    }
  } catch {
    /* localStorage unavailable or malformed entry */
  }
  return [...keys];
}

async function viewAccessKey(
  fetchFn: typeof fetch,
  url: RequestInfo | URL,
  accountId: string,
  publicKey: string,
): Promise<unknown | null> {
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "access-key-shim",
        method: "query",
        params: {
          request_type: "view_access_key",
          account_id: accountId,
          public_key: publicKey,
          finality: "optimistic",
        },
      }),
    });
    const json = await res.json();
    // A missing key comes back as `result.error`, not as an RPC error.
    if (!json?.result?.permission) return null;
    const { block_hash: _h, block_height: _b, ...accessKey } = json.result;
    return accessKey;
  } catch {
    return null;
  }
}

interface RpcResponse {
  id?: unknown;
  error?: {
    cause?: {
      name?: string;
      info?: { block_hash?: string; block_height?: number };
    };
  };
}
