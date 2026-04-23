// Same-origin JSON-RPC proxy. Exists purely to bypass CORS on the upstream
// NEAR RPC endpoints; it is stateless and does not cache or transform.
export const runtime = "edge";

const UPSTREAMS = [
  "https://free.rpc.fastnear.com",
  "https://rpc.mainnet.near.org",
];

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  let lastErr: unknown = null;
  for (const url of UPSTREAMS) {
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      if (!upstream.ok) {
        lastErr = new Error(`${url}: HTTP ${upstream.status}`);
        continue;
      }
      const text = await upstream.text();
      return new Response(text, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      lastErr = e;
    }
  }
  return new Response(
    JSON.stringify({ error: lastErr instanceof Error ? lastErr.message : String(lastErr) }),
    { status: 502, headers: { "content-type": "application/json" } },
  );
}
