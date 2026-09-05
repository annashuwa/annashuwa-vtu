import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initTestApp, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  // Rate limiting ON for this file only (isolated module registry per file).
  ctx = await initTestApp({ rateLimitEnabled: true });
});

afterAll(async () => {
  await ctx.cleanup();
});

describe("rate limiting + abuse shield", () => {
  it("returns 429 with Retry-After and X-RateLimit-* after 5 registers", async () => {
    const statuses: number[] = [];
    let retryAfter: string | undefined;
    for (let i = 0; i < 7; i++) {
      const res = await ctx.agent
        .post("/api/auth/register")
        .set("X-Forwarded-For", "rl-audit-suite")
        .send({
          fullName: "RL User",
          email: `rl${i}@example.com`,
          phone: `0809555000${i}`,
          password: "Abc12345",
          confirmPassword: "Abc12345",
        });
      statuses.push(res.status);
      if (res.status === 429) {
        retryAfter = res.headers["retry-after"] as string;
        expect(res.headers["x-ratelimit-limit"]).toBe("5");
        expect(res.headers["x-ratelimit-remaining"]).toBe("0");
      }
    }
    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("rejects oversized query strings with 414", async () => {
    const res = await ctx.agent.get(`/api/health?q=${"a".repeat(9000)}`);
    expect(res.status).toBe(414);
    expect(res.body.code).toBe("API_ERROR");
  });
});
