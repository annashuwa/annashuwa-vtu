import mongoose, { type ClientSession } from "mongoose";
import { logWarn } from "./logger";

let cached: boolean | null = null;

/**
 * Detects whether the connected MongoDB supports multi-document transactions
 * (i.e. it is a replica set member). Cached after first check.
 */
export async function mongoSupportsTransactions(): Promise<boolean> {
  if (cached !== null) return cached;
  const db = mongoose.connection.db;
  if (!db) {
    cached = false;
    return cached;
  }
  try {
    const info = (await db.admin().command({ replSetGetStatus: 1 })) as { members?: unknown[] };
    cached = Array.isArray(info.members) && info.members.length > 0;
  } catch {
    cached = false;
  }
  return cached;
}

/**
 * Runs `fn` inside a MongoDB multi-document transaction when the server
 * supports it. When it does not (standalone), runs `fn` without a session so
 * callers rely on atomic single-document operations plus idempotency and a
 * reconciliation safety net.
 *
 * `fn` receives a `ClientSession | undefined`. Pass it through to any operation
 * that accepts a session; operations ignore an undefined session.
 */
export async function withDbTransaction(fn: (session: ClientSession | undefined) => Promise<void>): Promise<void> {
  const supported = await mongoSupportsTransactions();
  if (!supported) {
    logWarn("mongo_transactions_not_supported", {
      mode: "atomic-compensating",
      hint: "Run MongoDB as a single-node replica set to enable multi-document transactions.",
    });
    await fn(undefined);
    return;
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}
