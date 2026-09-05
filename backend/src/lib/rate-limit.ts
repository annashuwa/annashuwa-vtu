import type { NextFunction, Request, Response } from "express";
import {
  RATE_LIMIT_ENABLED,
  RATE_LIMIT_CLEANUP_MS,
  RATE_LIMIT_MAX_KEYS,
} from "../config";

interface BucketConfig {
  limit: number;
  windowSeconds: number;
  message: string;
}

const BUCKETS: Record<string, BucketConfig> = {
  register: { limit: 5, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  login: { limit: 10, windowSeconds: 60, message: "Too many login attempts. Please wait a moment." },
  "forgot-password": { limit: 5, windowSeconds: 300, message: "Too many requests. Please wait a few minutes." },
  "reset-password": { limit: 5, windowSeconds: 300, message: "Too many requests. Please wait a few minutes." },
  "wallet-fund": { limit: 5, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  airtime: { limit: 10, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  data: { limit: 10, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  electricity: { limit: 10, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  cable: { limit: 10, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  "exam-pins-purchase": { limit: 5, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  "airtime-to-cash": { limit: 5, windowSeconds: 60, message: "Too many attempts. Please wait a moment." },
  "kyc-submit": { limit: 5, windowSeconds: 300, message: "Too many attempts. Please wait a moment." },
};

/** Per-key sliding-window hit log: array of hit timestamps (ms epoch). */
const hits = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return "local";
}

/** Drop entries older than their window to bound memory per key. */
function pruneKey(key: string, windowMs: number, now: number): void {
  const arr = hits.get(key);
  if (!arr) return;
  const kept = arr.filter((t) => t > now - windowMs);
  if (kept.length === 0) hits.delete(key);
  else hits.set(key, kept);
}

/** Bound overall store size by evicting the least-recently-touched keys. */
function evictIfNeeded(): void {
  if (hits.size <= RATE_LIMIT_MAX_KEYS) return;
  const ordered = [...hits.entries()].sort((a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0));
  let excess = hits.size - RATE_LIMIT_MAX_KEYS;
  for (const [key] of ordered) {
    if (excess <= 0) break;
    hits.delete(key);
    excess -= 1;
  }
}

// Background sweep so the in-memory store never grows without bound.
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of hits) {
    const last = arr[arr.length - 1] ?? 0;
    // We don't know the bucket here, so derive the window from the bucket key.
    const bucket = key.split(":")[0];
    const cfg = BUCKETS[bucket];
    const windowMs = cfg ? cfg.windowSeconds * 1000 : 60_000;
    if (now - last > windowMs) hits.delete(key);
  }
}, RATE_LIMIT_CLEANUP_MS);
sweepTimer.unref();

function setHeaders(res: Response, limit: number, remaining: number, resetEpochSeconds: number): void {
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  res.setHeader("X-RateLimit-Reset", String(resetEpochSeconds));
}

export function rateLimit(bucket: string) {
  const cfg = BUCKETS[bucket];
  if (!cfg) {
    throw new Error(`Unknown rate-limit bucket: ${bucket}`);
  }
  return (req: Request, res: Response, next: NextFunction) => {
    if (!RATE_LIMIT_ENABLED) return next();

    const now = Date.now();
    const windowMs = cfg.windowSeconds * 1000;
    const key = `${bucket}:${getClientIp(req)}`;

    pruneKey(key, windowMs, now);
    const arr = hits.get(key) ?? [];
    const resetEpochSeconds = Math.floor((arr[0] !== undefined ? arr[0] + windowMs : now + windowMs) / 1000);

    if (arr.length >= cfg.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetEpochSeconds * 1000 - now) / 1000));
      setHeaders(res, cfg.limit, 0, resetEpochSeconds);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: cfg.message, code: "API_ERROR" });
    }

    arr.push(now);
    hits.set(key, arr);
    evictIfNeeded();

    setHeaders(res, cfg.limit, cfg.limit - arr.length, resetEpochSeconds);
    return next();
  };
}
