import { providers } from "near-api-js";
import { fromBase64 } from "./format";

// rpc.mainnet.near.org does not set CORS headers on preflight, so the browser
// cannot hit it directly. FastNEAR is CORS-friendly and used as the fast
// path; the same-origin /api/rpc proxy is the guaranteed fallback (it
// forwards to the official RPC server-side, where CORS does not apply).
export const RPC_PRIMARY = "https://free.rpc.fastnear.com";
export const RPC_FALLBACK = "/api/rpc";

let primary = new providers.JsonRpcProvider({ url: RPC_PRIMARY });
let fallback = new providers.JsonRpcProvider({ url: RPC_FALLBACK });

export function getProvider(): providers.JsonRpcProvider {
  return primary;
}

async function callWithFallback<T>(fn: (p: providers.JsonRpcProvider) => Promise<T>): Promise<T> {
  try {
    return await fn(primary);
  } catch (err) {
    try {
      return await fn(fallback);
    } catch {
      throw err;
    }
  }
}

export async function viewCall<T = unknown>(
  contract: string,
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const argsB64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(JSON.stringify(args)).toString("base64")
      : btoa(JSON.stringify(args));

  const result = await callWithFallback((p) =>
    p.query<CallFunctionResult>({
      request_type: "call_function",
      account_id: contract,
      method_name: method,
      args_base64: argsB64,
      finality: "final",
    }),
  );

  const bytes = result.result;
  const text = new TextDecoder().decode(new Uint8Array(bytes));
  if (text === "") return null as T;
  return JSON.parse(text) as T;
}

interface CallFunctionResult {
  result: number[];
  logs: string[];
  block_height: number;
  block_hash: string;
}

interface ViewAccountResult {
  amount: string;
  locked: string;
  code_hash: string;
  storage_usage: number;
  storage_paid_at: number;
  block_height: number;
  block_hash: string;
}

export async function viewAccount(accountId: string): Promise<ViewAccountResult> {
  return callWithFallback((p) =>
    p.query<ViewAccountResult>({
      request_type: "view_account",
      account_id: accountId,
      finality: "final",
    }),
  );
}

/**
 * Parse the SuccessValue from a FunctionCall tx outcome. SuccessValue is a
 * base64 string of the raw method return; for add_proposal that's a
 * JSON-encoded number like "42".
 */
export function parseTxSuccessValue(outcome: unknown): string | null {
  const o = outcome as { status?: { SuccessValue?: string } } | undefined;
  const v = o?.status?.SuccessValue;
  if (typeof v !== "string") return null;
  if (v === "") return "";
  return fromBase64(v);
}
