import { FLUTTERWAVE_SECRET_KEY } from "../../config";
import { ApiError } from "../../lib/errors";
import type { PaymentGateway, InitializeRequest, InitializeResult, VerifyResult } from "./types";

export class FlutterwaveGateway implements PaymentGateway {
  readonly name = "FLUTTERWAVE";

  async initialize(input: InitializeRequest): Promise<InitializeResult> {
    if (!FLUTTERWAVE_SECRET_KEY) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: "NGN",
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/wallet`,
        customer: { email: input.email },
        meta: input.metadata,
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (data.status !== "success") {
      throw new ApiError(502, (data.message as string) ?? "Flutterwave initialization failed", "PAYMENT_ERROR");
    }
    return {
      reference: input.reference,
      gateway: "FLUTTERWAVE",
      authUrl: ((data.data as Record<string, unknown>)?.link as string) ?? undefined,
    };
  }

  async verify(reference: string): Promise<VerifyResult> {
    if (!FLUTTERWAVE_SECRET_KEY) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
      headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` },
    });
    const data = (await res.json()) as Record<string, unknown>;
    const d = (data.data as Record<string, unknown>) ?? {};
    if (data.status !== "success") {
      throw new ApiError(502, (data.message as string) ?? "Flutterwave verification failed", "PAYMENT_ERROR");
    }
    return {
      reference,
      status: String(d.status) === "successful" ? "SUCCESSFUL" : "FAILED",
      amount: Number(d.amount ?? 0),
      gatewayRef: (d.id as string) ?? reference,
    };
  }
}