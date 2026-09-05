import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initTestApp, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  // Fail rate 0 keeps the mock deterministic-ish; the debit assertion below
  // holds for both SUCCESSFUL and PROCESSING (only FAILED refunds).
  ctx = await initTestApp({ mockFailRate: "0", mockDelayMs: "50" });
});

afterAll(async () => {
  await ctx.cleanup();
});

describe("airtime purchase", () => {
  it("debits exactly once and exposes provider fields", async () => {
    const { authHeader } = await ctx.createUser({ balance: 10000 });
    const res = await ctx.agent.post("/api/airtime").set(authHeader).send({
      network: "MTN",
      phone: "08011111111",
      amount: 100,
    });
    expect(res.status).toBe(200);
    expect(["SUCCESSFUL", "PROCESSING"]).toContain(res.body.transaction.status);
    expect(typeof res.body.transaction.reference).toBe("string");

    const wallet = await ctx.agent.get("/api/wallet").set(authHeader);
    expect(wallet.body.wallet.balance).toBe("9900");
    expect(wallet.body.wallet.availableBalance).toBe("9900");
  });

  it("rejects insufficient balance without touching it", async () => {
    const { authHeader } = await ctx.createUser({ balance: 500 });
    const res = await ctx.agent.post("/api/airtime").set(authHeader).send({
      network: "MTN",
      phone: "08011111111",
      amount: 50000,
    });
    expect(res.status).toBe(400);
    const wallet = await ctx.agent.get("/api/wallet").set(authHeader);
    expect(wallet.body.wallet.balance).toBe("500");
  });

  it("validates input: empty, negative, unknown network", async () => {
    const { authHeader } = await ctx.createUser({ balance: 10000 });
    expect((await ctx.agent.post("/api/airtime").set(authHeader).send({})).status).toBe(400);
    expect(
      (
        await ctx.agent.post("/api/airtime").set(authHeader).send({
          network: "MTN",
          phone: "08011111111",
          amount: -50,
        })
      ).status
    ).toBe(400);
    expect(
      (
        await ctx.agent.post("/api/airtime").set(authHeader).send({
          network: "NOPE",
          phone: "08011111111",
          amount: 100,
        })
      ).status
    ).toBe(400);
  });

  it("scopes transaction history to the owner (IDOR check)", async () => {
    const a = await ctx.createUser({ balance: 10000 });
    const b = await ctx.createUser({ balance: 10000 });
    const p = await ctx.agent.post("/api/airtime").set(a.authHeader).send({
      network: "MTN",
      phone: "08011111111",
      amount: 100,
    });
    const ref = p.body.transaction.reference;
    const cross = await ctx.agent.get(`/api/transactions/${ref}`).set(b.authHeader);
    expect(cross.status).toBe(404);
    const owner = await ctx.agent.get(`/api/transactions/${ref}`).set(a.authHeader);
    expect(owner.status).toBe(200);
  });
});
