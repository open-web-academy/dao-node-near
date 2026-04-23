export const YOCTO_PER_NEAR = 10n ** 24n;
export const STORAGE_BUFFER_YOCTO = 5n * 10n ** 23n; // 0.5 NEAR

export function nearToYocto(n: string): string {
  const s = n.trim();
  if (s === "") throw new Error("amount is empty");
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`invalid amount: ${n}`);
  const [whole, frac = ""] = s.split(".");
  if (frac.length > 24) throw new Error("too many decimals (max 24)");
  const padded = (frac + "0".repeat(24 - frac.length));
  const joined = `${whole}${padded}`.replace(/^0+/, "");
  return joined === "" ? "0" : joined;
}

export function yoctoToNear(y: string, decimals = 6): string {
  if (!/^\d+$/.test(y)) return "0";
  const bi = BigInt(y);
  const whole = bi / YOCTO_PER_NEAR;
  const frac = bi % YOCTO_PER_NEAR;
  if (decimals <= 0) return whole.toString();
  const fracStr = frac.toString().padStart(24, "0").slice(0, decimals);
  return `${whole.toString()}.${fracStr}`;
}

export function fmtNear(y: string | undefined | null, decimals = 6): string {
  if (y === undefined || y === null || y === "") return "—";
  try {
    return yoctoToNear(y, decimals);
  } catch {
    return "—";
  }
}

export function bigIntMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function bigIntMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

// UTF-8 safe base64 encode (browser + node).
export function toBase64(s: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(s, "utf8").toString("base64");
  }
  // Browser: handle unicode via encodeURIComponent roundtrip.
  return btoa(
    encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    ),
  );
}

// Decode SuccessValue (base64) into a UTF-8 string.
export function fromBase64(s: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(s, "base64").toString("utf8");
  }
  const bin = atob(s);
  return decodeURIComponent(
    bin
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
}

const ACCOUNT_ID_RE = /^(([a-z\d]+[-_])*[a-z\d]+(\.([a-z\d]+[-_])*[a-z\d]+)*|[0-9a-f]{64})$/;

export function isValidAccountId(id: string): boolean {
  if (!id) return false;
  if (id.length < 2 || id.length > 64) return false;
  return ACCOUNT_ID_RE.test(id);
}

export function shortAccount(id: string): string {
  if (id.length <= 24) return id;
  return `${id.slice(0, 10)}…${id.slice(-10)}`;
}
