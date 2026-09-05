import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initTestApp, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await initTestApp();
});

afterAll(async () => {
  await ctx.cleanup();
});

describe("health", () => {
  it("GET /api/health returns ok with db status", async () => {
    const res = await ctx.agent.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.db).toBe("boolean");
  });
});
