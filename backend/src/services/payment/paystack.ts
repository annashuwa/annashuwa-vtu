import { PAYSTACK_SECRET_KEY } from "../../config";
import { ApiError } from "../../lib/errors";
import type { PaymentGateway, InitializeRequest, InitializeResult, VerifyResult } from "./types";

export class PaystackGateway implements PaymentGateway {
  readonly name = "PAYSTACK";

  async initialize(input: InitializeRequest): Promise<InitializeResult> {
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not set");
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        reference: input.reference,
        metadata: input.metadata,
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!data.status) {
      throw new ApiError(502, (data.message as string) ?? "Paystack initialization failed", "PAYMENT_ERROR");
    }
    return {
      reference: input.reference,
      gateway: "PAYSTACK",
      authUrl: ((data.data as Record<string, unknown>)?.authorization_url as string) ?? undefined,
    };
  }

  async verify(reference: string): Promise<VerifyResult> {
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not set");
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = (await res.json()) as Record<string, unknown>;
    const d = (data.data as Record<string, unknown>) ?? {};
    if (!data.status) {
      throw new ApiError(502, (data.message as string) ?? "Paystack verification failed", "PAYMENT_ERROR");
    }
    return {
      reference,
      status: d.status === "success" ? "SUCCESSFUL" : "FAILED",
      amount: Number(d.amount ?? 0) / 100,
      gatewayRef: (d.reference as string) ?? reference,
    };
  }
}