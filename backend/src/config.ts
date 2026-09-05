import "dotenv/config";

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const APP_ENV = process.env.APP_ENV ?? (NODE_ENV === "production" ? "production" : "development");
export const isDev = APP_ENV === "development" || process.env.APP_ENV === undefined;

export const PORT = Number(process.env.PORT ?? 4000);

export const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/annashuwa_vtu";

export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me-in-production";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
export const JWT_ISSUER = process.env.JWT_ISSUER ?? "annashuwa-vtu";
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "annashuwa-vtu-web";
export const SESSION_COOKIE = process.env.SESSION_COOKIE ?? "ans_session";
export const REFRESH_COOKIE = process.env.REFRESH_COOKIE ?? "ans_refresh";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
export const secureCookies = APP_URL.startsWith("https://");

export const MOCK_MODE = process.env.MOCK_MODE === "true";
export const MOCK_FAIL_RATE = Number(process.env.MOCK_FAIL_RATE ?? 0.1);
export const MOCK_DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 1200);

// Multi-provider VTU configuration. A provider is used in HTTP mode when its
// base URL is configured; otherwise it falls back to a mock implementation.
export const VTU_PROVIDER = (process.env.VTU_PROVIDER ?? "mock") as "mock" | "auto" | "bilalsadasub" | "rapidbills" | "cheapdatahub" | "vtung" | "vtpass";

export const BILALSADASUB_BASE_URL = process.env.BILALSADASUB_BASE_URL ?? "";
export const BILALSADASUB_TOKEN = process.env.BILALSADASUB_TOKEN ?? "";

export const RAPIDBILLS_BASE_URL = process.env.RAPIDBILLS_BASE_URL ?? "";
export const RAPIDBILLS_TOKEN = process.env.RAPIDBILLS_TOKEN ?? "";

export const CHEAPDATAHUB_BASE_URL = process.env.CHEAPDATAHUB_BASE_URL ?? "";
export const CHEAPDATAHUB_TOKEN = process.env.CHEAPDATAHUB_TOKEN ?? "";

export const VTUNG_BASE_URL = process.env.VTUNG_BASE_URL ?? "";
export const VTUNG_TOKEN = process.env.VTUNG_TOKEN ?? "";

export const VTPASS_BASE_URL = process.env.VTPASS_BASE_URL ?? "";
export const VTPASS_TOKEN = process.env.VTPASS_TOKEN ?? "";
export const VTPASS_USERNAME = process.env.VTPASS_USERNAME ?? "";

export const DEFAULT_ACTIVE_PROVIDER = (process.env.DEFAULT_ACTIVE_PROVIDER ?? "mock") as string;

// Provider readiness & operations.
// VTU_MAX_FAILOVER_ATTEMPTS caps how many *fallback* providers are tried after
// the routed primary fails (0 disables failover; 2 is the default).
export const VTU_MAX_FAILOVER_ATTEMPTS = Number(process.env.VTU_MAX_FAILOVER_ATTEMPTS ?? 2);
export const VTU_FORCE_MOCK_FAIL = process.env.VTU_FORCE_MOCK_FAIL === "true";
// Upper bound for any single upstream VTU HTTP call. Hung providers fail fast
// (failover + reconciliation take over) instead of holding requests forever.
export const VTU_HTTP_TIMEOUT_MS = Number(process.env.VTU_HTTP_TIMEOUT_MS ?? 30_000);

// Background jobs (pending-transaction reconciliation).
export const JOB_RECONCILE_ENABLED = process.env.JOB_RECONCILE_ENABLED !== "false";
export const JOB_RECONCILE_INTERVAL_MS = Number(process.env.JOB_RECONCILE_INTERVAL_MS ?? 2 * 60_000);
export const JOB_RECONCILE_GRACE_MS = Number(process.env.JOB_RECONCILE_GRACE_MS ?? 5 * 60_000);
export const JOB_RECONCILE_MAX_AGE_MS = Number(process.env.JOB_RECONCILE_MAX_AGE_MS ?? 30 * 60_000);
export const JOB_RECONCILE_BATCH = Number(process.env.JOB_RECONCILE_BATCH ?? 50);

export const PAYMENT_MODE = process.env.PAYMENT_MODE === "live" ? "live" : "test";
export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? "";
export const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY ?? "";
export const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY ?? "";
export const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY ?? "";
export const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE ?? "";

export const MESSENGER_PROVIDER = process.env.MESSENGER_PROVIDER ?? "log";
export const SMTP_HOST = process.env.SMTP_HOST ?? "";
export const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
export const SMTP_USER = process.env.SMTP_USER ?? "";
export const SMTP_PASS = process.env.SMTP_PASS ?? "";
export const SMTP_FROM = process.env.SMTP_FROM ?? "ANNASHUWA VTU <no-reply@annashuwa.com>";
export const SMS_PROVIDER = process.env.SMS_PROVIDER ?? "";

export const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@annashuwa.com";
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
export const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "ANNASHUWA Admin";
export const SEED_ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? "+2348000000000";

export const DEFAULT_KYC_THRESHOLD = 20000;

// Rate limiting & abuse protection.
// RATE_LIMIT_ENABLED can be turned off for local testing only.
// RATE_LIMIT_CLEANUP_MS controls how often the in-memory store is swept for
// stale keys (bounds memory growth). RATE_LIMIT_MAX_KEYS caps the store size
// by evicting the least-recently-touched keys once exceeded.
export const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";
export const RATE_LIMIT_CLEANUP_MS = Number(process.env.RATE_LIMIT_CLEANUP_MS ?? 30_000);
export const RATE_LIMIT_MAX_KEYS = Number(process.env.RATE_LIMIT_MAX_KEYS ?? 10_000);

// Global abuse-protection shields (applied in app.ts).
// RATE_LIMIT_MAX_JSON_BYTES caps parsed JSON bodies (in addition to exprjson's limit).
export const MAX_JSON_BODY_BYTES = Number(process.env.MAX_JSON_BODY_BYTES ?? 1_048_576);