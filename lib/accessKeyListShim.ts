// The wallet SDKs (Meteor's ConnectedMeteorWalletAccount and near-api-js's
// ConnectedWalletAccount) call `view_access_key_list` on every
// signAndSendTransaction to look for a local function-call key. NEAR RPC now
// rejects that query with TOO_MANY_ACCESS_KEYS for accounts holding more than
// 100 keys, which aborts signing before the wallet is even opened.
//
// Our transactions always need wallet approval anyway, so when the RPC refuses
// the list we answer with an empty one: the SDK then finds no local key and
// falls through to the wallet's own signing flow (Meteor popup).
//
// The SDKs resolve `global.fetch` at call time, so patching it once is enough.

let installed = false;

export function installAccessKeyListShim(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const res = await originalFetch(input, init);
    if (!isAccessKeyListQuery(init?.body)) return res;

    let json: RpcResponse;
    try {
      json = await res.clone().json();
    } catch {
      return res;
    }
    if (json?.error?.cause?.name !== "TOO_MANY_ACCESS_KEYS") return res;

    const info = json.error.cause.info ?? {};
    const body = {
      jsonrpc: "2.0",
      id: json.id,
      result: { keys: [], block_hash: info.block_hash, block_height: info.block_height },
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

function isAccessKeyListQuery(body: BodyInit | null | undefined): boolean {
  if (typeof body !== "string" || !body.includes("view_access_key_list")) return false;
  try {
    const req = JSON.parse(body);
    return req?.method === "query" && req?.params?.request_type === "view_access_key_list";
  } catch {
    return false;
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
