import crypto from "crypto";

/** Generate a short unique id (string storage, mirroring Prisma cuid strings). */
export function genId(prefix = "c"): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(8).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `${prefix}${ts}${rand}`.slice(0, 25);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Public transaction reference. Format: PREFIX-YYYYMMDDHHMMSS-<6 upper alnum>
 * e.g. ANS-20250830123456-A1B2C3
 */
export function generateReference(prefix = "ANS"): string {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    pad2(d.getMonth() + 1),
    pad2(d.getDate()),
    pad2(d.getHours()),
    pad2(d.getMinutes()),
    pad2(d.getSeconds()),
  ].join("");
  const suffix = crypto
    .randomBytes(4)
    .toString("base64url")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(6, "R");
  return `${prefix}-${stamp}-${suffix}`;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Money is stored as a JS number but serialized to clients as a string (Decimal parity). */
export function moneyToString(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  return String(Number(n));
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Best-effort network detection from a Nigerian mobile number prefix
 * (mirrors lib/constants.ts).
 */
export function detectNetwork(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  const prefix = digits.slice(-10, -7);
  const map: Record<string, string> = {
    "703": "MTN", "706": "MTN", "803": "MTN", "806": "MTN",
    "810": "MTN", "813": "MTN", "814": "MTN", "816": "MTN",
    "903": "MTN", "906": "MTN", "913": "MTN", "916": "MTN",
    "701": "Airtel", "708": "Airtel", "802": "Airtel", "808": "Airtel",
    "812": "Airtel", "901": "Airtel", "902": "Airtel", "904": "Airtel",
    "705": "Glo", "805": "Glo", "807": "Glo", "811": "Glo",
    "815": "Glo", "905": "Glo", "915": "Glo", "929": "Glo",
    "809": "9mobile", "817": "9mobile", "818": "9mobile",
    "908": "9mobile", "909": "9mobile", "910": "9mobile",
  };
  return map[prefix] ?? null;
}

export function escRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isISODateString(s: string): boolean {
  return !Number.isNaN(Date.parse(s));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}