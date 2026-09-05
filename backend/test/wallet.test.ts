import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initTestApp, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await initTestApp();
});

afterAll(async () => {
  await ctx.cleanup();
});

describe("wallet funding (TEST gateway)", () => {
  it("credits exactly once; duplicate confirm is idempotent", async () => {
    const { authHeader } = await ctx.createUser({ balance: 1000 });
    const before = await ctx.agent.get("/api/wallet").set(authHeader);
    expect(before.body.wallet.balance).toBe("1000");

    const fund = await ctx.agent
      .post("/api/wallet/fund")
      .set(authHeader)
      .send({ amount: 500, gateway: "TEST" });
    expect(fund.status).toBe(200);
    expect(typeof fund.body.reference).toBe("string");

    const c1 = await ctx.agent
      .post("/api/wallet/fund/confirm")
      .set(authHeader)
      .send({ reference: fund.body.reference, simulate: "success" });
    expect(c1.status).toBe(200);
    expect(c1.body.status).toBe("SUCCESSFUL");
    expect(c1.body.balance).toBe(1500);

    const c2 = await ctx.agent
      .post("/api/wallet/fund/confirm")
      .set(authHeader)
      .send({ reference: fund.body.reference, simulate: "success" });
    expect(c2.status).toBe(200);
    expect(c2.body.balance).toBe(1500);

    const after = await ctx.agent.get("/api/wallet").set(authHeader);
    expect(after.body.wallet.balance).toBe("1500");
    expect(after.body.wallet.availableBalance).toBe("1500");
  });

  it("declined funding does not credit", async () => {
    const { authHeader } = await ctx.createUser({ balance: 1000 });
    const fund = await ctx.agent
      .post("/api/wallet/fund")
      .set(authHeader)
      .send({ amount: 500, gateway: "TEST" });
    const c = await ctx.agent
      .post("/api/wallet/fund/confirm")
      .set(authHeader)
      .send({ reference: fund.body.reference, simulate: "decline" });
    expect(c.body.status).toBe("FAILED");
    const after = await ctx.agent.get("/api/wallet").set(authHeader);
    expect(after.body.wallet.balance).toBe("1000");
  });

  it("rejects funding below minimum and unknown references", async () => {
    const { authHeader } = await ctx.createUser({ balance: 0 });
    const small = await ctx.agent
      .post("/api/wallet/fund")
      .set(authHeader)
      .send({ amount: 50, gateway: "TEST" });
    expect(small.status).toBe(400);
    const unknown = await ctx.agent
      .post("/api/wallet/fund/confirm")
      .set(authHeader)
      .send({ reference: "ANS-FUND-NOPE", simulate: "success" });
    expect(unknown.status).toBe(404);
  });

  it("blocks cross-user funding confirmation (ownership)", async () => {
    const owner = await ctx.createUser({ balance: 0 });
    const intruder = await ctx.createUser({ balance: 0 });
    const fund = await ctx.agent
      .post("/api/wallet/fund")
      .set(owner.authHeader)
      .send({ amount: 500, gateway: "TEST" });
    const res = await ctx.agent
      .post("/api/wallet/fund/confirm")
      .set(intruder.authHeader)
      .send({ reference: fund.body.reference, simulate: "success" });
    expect(res.status).toBe(403);
  });
});
