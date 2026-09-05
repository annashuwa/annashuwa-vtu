import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initTestApp, type TestContext } from "./helpers";

/**
 * Regression tests for BUG-001 (concurrent wallet lost-update).
 * These exercise debitWallet/creditWallet directly with parallel callers, so
 * they are deterministic (no provider randomness) and fast.
 */
let ctx: TestContext;
let walletService: typeof import("../src/services/wallet.service");

beforeAll(async () => {
  ctx = await initTestApp();
  walletService = await import("../src/services/wallet.service");
});

afterAll(async () => {
  await ctx.cleanup();
});

describe("concurrent wallet operations (BUG-001 regression)", () => {
  it("applies N parallel debits exactly (no lost updates)", async () => {
    const { user } = await ctx.createUser({ balance: 35740 });
    const userId = String(user._id);
    await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        walletService.debitWallet({
          userId,
          amount: 5000,
          type: "AIRTIME_PURCHASE",
          reference: `CONC-${Date.now()}-${i}`,
        })
      )
    );
    const wallet = await ctx.models.Wallet.findOne({ userId });
    expect(Number(wallet.balance)).toBe(5740);
    expect(Number(wallet.availableBalance)).toBe(5740);
  });

  it("blocks overspend under concurrency (guard holds, never negative)", async () => {
    const { user } = await ctx.createUser({ balance: 5740 });
    const userId = String(user._id);
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, (_, i) =>
        walletService.debitWallet({
          userId,
          amount: 5000,
          type: "AIRTIME_PURCHASE",
          reference: `OVER-${Date.now()}-${i}`,
        })
      )
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    expect(ok).toBe(1);
    expect(failed).toBe(2);
    const wallet = await ctx.models.Wallet.findOne({ userId });
    expect(Number(wallet.balance)).toBe(740);
    expect(Number(wallet.balance) < 0).toBe(false);
  });

  it("applies parallel credits exactly", async () => {
    const { user } = await ctx.createUser({ balance: 0 });
    const userId = String(user._id);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        walletService.creditWallet({
          userId,
          amount: 100,
          type: "DEPOSIT",
          reference: `CRED-${Date.now()}-${i}`,
        })
      )
    );
    const wallet = await ctx.models.Wallet.findOne({ userId });
    expect(Number(wallet.balance)).toBe(1000);
    expect(Number(wallet.availableBalance)).toBe(1000);
  });
});
