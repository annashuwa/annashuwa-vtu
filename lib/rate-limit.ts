type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function windowMs(windowSeconds: number) {
  return windowSeconds * 1000;
}

/**
 * Simple in-memory sliding-window rate limiter.
 * NOTE: per-process. Good for single-instance localhost/dev deploys.
 */
export function rateLimit(identifier: string, limit: number, windowSeconds = 60): boolean {
  const now = Date.now();
  const bucket = store.get(identifier);
  if (!bucket || bucket.resetAt <= now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs(windowSeconds) });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function getClientId(req: Request, bucket = "global"): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() ?? "local";
  return `${bucket}:${ip}`;
}

export const AUTH_RATE_LIMIT = { limit: 10, window: 60 };
export const PURCHASE_RATE_LIMIT = { limit: 20, window: 60 };