import {
  FLUTTERWAVE_SECRET_KEY,
  MONNIFY_CONTRACT_CODE,
  MONNIFY_SECRET_KEY,
  PAYMENT_MODE,
  PAYSTACK_SECRET_KEY,
} from "../../config";

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
  message?: string;
  authUrl?: string;
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

export function isEnabled(gateway: string): boolean {
  if (PAYMENT_MODE === "test") return gateway === "TEST";
  switch (gateway) {
    case "PAYSTACK":
      return Boolean(PAYSTACK_SECRET_KEY);
    case "FLUTTERWAVE":
      return Boolean(FLUTTERWAVE_SECRET_KEY);
    case "MONNIFY":
      return Boolean(MONNIFY_SECRET_KEY && MONNIFY_CONTRACT_CODE);
    case "TEST":
      return true;
    default:
      return false;
  }
}

export function findEnabledGateway(preferred?: string): string {
  if (preferred && isEnabled(preferred)) return preferred;
  const order = ["PAYSTACK", "FLUTTERWAVE", "MONNIFY", "TEST"];
  for (const g of order) {
    if (isEnabled(g)) return g;
  }
  return "TEST";
}