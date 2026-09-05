/**
 * Payment provider abstraction.
 *
 * Wallets are funded through a `PaymentGateway`. Swap implementations via
 * `getPaymentProvider()` in index.ts. In test mode the built-in TestGateway
 * simulates approvals/declines — in live mode, real gateways run.
 */

export interface InitializeRequest {
  userId: string;
  email: string;
  amount: number;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeResult {
  reference: string;
  gateway: string;
  authUrl?: string;
  message?: string;
}

export interface VerifyResult {
  reference: string;
  status: "SUCCESSFUL" | "FAILED";
  amount: number;
  gatewayRef?: string;
  message?: string;
}

export interface PaymentGateway {
  readonly name: string;
  initialize(input: InitializeRequest): Promise<InitializeResult>;
  verify(reference: string): Promise<VerifyResult>;
}

export function findEnabledGateway(preferred?: string): string {
  const mode = process.env.PAYMENT_MODE === "live" ? "live" : "test";
  if (mode === "test") return "TEST";
  if (preferred === "PAYSTACK" && process.env.PAYSTACK_SECRET_KEY) return "PAYSTACK";
  if (preferred === "FLUTTERWAVE" && process.env.FLUTTERWAVE_SECRET_KEY) return "FLUTTERWAVE";
  if (preferred === "MONNIFY" && process.env.MONNIFY_SECRET_KEY) return "MONNIFY";
  if (process.env.PAYSTACK_SECRET_KEY) return "PAYSTACK";
  if (process.env.FLUTTERWAVE_SECRET_KEY) return "FLUTTERWAVE";
  if (process.env.MONNIFY_SECRET_KEY) return "MONNIFY";
  return "TEST";
}