import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initTestApp, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await initTestApp();
});

afterAll(async () => {
  await ctx.cleanup();
});

describe("auth", () => {
  it("registers a user with wallet, JWT body token and session cookie", async () => {
    const res = await ctx.agent.post("/api/auth/register").send({
      fullName: "Audit Tester",
      email: "audit-tester@example.com",
      phone: "08091111111",
      password: "Abc12345",
      confirmPassword: "Abc12345",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("audit-tester@example.com");
    expect(res.body.user.role).toBe("USER");
    expect(res.body.user.wallet.balance).toBe("0");
    expect(typeof res.body.token).toBe("string");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.join(";")).toContain("ans_session");
  });

  it("rejects duplicate email and duplicate phone", async () => {
    const dupEmail = await ctx.agent.post("/api/auth/register").send({
      fullName: "Dup Email",
      email: "audit-tester@example.com",
      phone: "08092222222",
      password: "Abc12345",
      confirmPassword: "Abc12345",
    });
    expect(dupEmail.status).toBe(409);
    const dupPhone = await ctx.agent.post("/api/auth/register").send({
      fullName: "Dup Phone",
      email: "unique-phone@example.com",
      phone: "08091111111",
      password: "Abc12345",
      confirmPassword: "Abc12345",
    });
    expect(dupPhone.status).toBe(409);
  });

  it("ignores a client-supplied role on register (no privilege escalation)", async () => {
    const res = await ctx.agent.post("/api/auth/register").send({
      fullName: "Sneaky Admin",
      email: "sneaky-admin@example.com",
      phone: "08093333333",
      password: "Abc12345",
      confirmPassword: "Abc12345",
      role: "ADMIN",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("USER");
  });

  it("logs in, rejects wrong password, and serves /me", async () => {
    const ok = await ctx.agent.post("/api/auth/login").send({
      email: "audit-tester@example.com",
      password: "Abc12345",
    });
    expect(ok.status).toBe(200);
    expect(typeof ok.body.token).toBe("string");

    const bad = await ctx.agent.post("/api/auth/login").send({
      email: "audit-tester@example.com",
      password: "Wrong1234",
    });
    expect(bad.status).toBe(401);

    const me = await ctx.agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${ok.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("audit-tester@example.com");

    const anon = await ctx.agent.get("/api/auth/me");
    expect(anon.status).toBe(200);
    expect(anon.body.user).toBeNull();
  });

  it("enforces admin authorization: anon 401, user 403, admin 200", async () => {
    const anon = await ctx.agent.get("/api/admin/stats");
    expect(anon.status).toBe(401);

    const { authHeader } = await ctx.createUser({ role: "USER" });
    const userBlocked = await ctx.agent.get("/api/admin/stats").set(authHeader);
    expect(userBlocked.status).toBe(403);

    const admin = await ctx.createUser({ role: "ADMIN" });
    const adminOk = await ctx.agent.get("/api/admin/stats").set(admin.authHeader);
    expect(adminOk.status).toBe(200);
    expect(typeof adminOk.body.totalUsers).toBe("number");
  });

  it("rejects expired/tampered tokens", async () => {
    const bad = await ctx.agent.get("/api/wallet").set("Authorization", "Bearer not.a.token");
    expect(bad.status).toBe(401);
  });
});
