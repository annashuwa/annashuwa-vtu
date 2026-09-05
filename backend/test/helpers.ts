/**
 * Integration-test harness (supertest + vitest).
 *
 * Safety first: tests run ONLY against a dedicated test database. initTestApp()
 * refuses to start unless MONGODB_URI contains "test", so a misconfigured env can
 * never wipe dev/prod data.
 *
 * All src modules are imported dynamically AFTER env is set, because config.ts
 * reads process.env at import time. Each test file calls initTestApp() in
 * beforeAll (vitest isolates modules per file, so per-file env is safe).
 */
import request from "supertest";
import type { Model } from "mongoose";
import type { IUser } from "../src/models/user";
import type { IWallet } from "../src/models/wallet";
import type { ITransaction } from "../src/models/transaction";
import type { IWalletTransaction } from "../src/models/walletTransaction";
import type { IPayment } from "../src/models/payment";

export const TEST_DB_URI = "mongodb://127.0.0.1:27017/annashuwa_vtu_test";

export interface TestEnv {
  rateLimitEnabled?: boolean;
  mockDelayMs?: string;
  mockFailRate?: string;
}

interface TestUser {
  _id: unknown;
  fullName: string;
  email: string;
}

export interface TestContext {
  agent: request.SuperTest<request.Test>;
  models: {
    User: Model<IUser>;
    Wallet: Model<IWallet>;
    Transaction: Model<ITransaction>;
    WalletTransaction: Model<IWalletTransaction>;
    Payment: Model<IPayment>;
  };
  signToken: (userId: string, role?: string) => Promise<string>;
  createUser: (overrides?: {
    email?: string;
    phone?: string;
    role?: string;
    balance?: number;
  }) => Promise<{ user: TestUser; token: string; authHeader: Record<string, string> }>;
  cleanup: () => Promise<void>;
}

let counter = 0;

export async function initTestApp(env: TestEnv = {}): Promise<TestContext> {
  process.env.MONGODB_URI = TEST_DB_URI;
  process.env.RATE_LIMIT_ENABLED = env.rateLimitEnabled === true ? "true" : "false";
  process.env.MOCK_DELAY_MS = env.mockDelayMs ?? "50";
  process.env.MOCK_FAIL_RATE = env.mockFailRate ?? "0";
  process.env.VTU_FORCE_MOCK_FAIL = "false";

  if (!String(process.env.MONGODB_URI).includes("test")) {
    throw new Error("Refusing to run tests: MONGODB_URI does not contain 'test'.");
  }

  const [{ default: app }, models, jwt, password] = await Promise.all([
    import("../src/app"),
    import("../src/models"),
    import("../src/lib/jwt"),
    import("../src/services/password.service"),
  ]);
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(TEST_DB_URI);

  const { User, Wallet, Transaction, WalletTransaction, Payment } = models;

  async function wipe() {
    const collections: Array<{ deleteMany: (filter: object) => Promise<unknown> }> = [
      User,
      Wallet,
      Transaction,
      WalletTransaction,
      Payment,
    ];
    await Promise.all(collections.map((m) => m.deleteMany({})));
  }
  await wipe();

  async function createUser(
    overrides: { email?: string; phone?: string; role?: string; balance?: number } = {}
  ) {
    counter += 1;
    const tag = `${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 7)}`;
    const email = overrides.email ?? `test-${tag}@example.com`;
    const phone = overrides.phone ?? `0809${String(1000000 + Math.floor(Math.random() * 8999999))}`;
    const role = overrides.role ?? "USER";
    const balance = overrides.balance ?? 0;
    const user = await User.create({
      fullName: "Test User",
      email,
      phone,
      password: await password.hashPassword("Abc12345"),
      role,
      status: "ACTIVE",
      emailVerified: true,
    });
    await Wallet.create({
      userId: String(user._id),
      balance,
      availableBalance: balance,
      pendingBalance: 0,
      currency: "NGN",
    });
    const token = jwt.signSession({
      sub: String(user._id),
      role,
      name: user.fullName,
      email: user.email,
    });
    return { user, token, authHeader: { Authorization: `Bearer ${token}` } };
  }

  return {
    agent: request(app),
    models: { User, Wallet, Transaction, WalletTransaction, Payment },
    signToken: async (userId: string, role = "USER") =>
      jwt.signSession({ sub: userId, role, name: "T", email: "t@example.com" }),
    createUser,
    cleanup: async () => {
      await wipe();
      await mongoose.disconnect();
    },
  };
}
