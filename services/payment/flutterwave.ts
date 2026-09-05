/**
 * Flutterwave gateway adapter. Active when FLUTTERWAVE_SECRET_KEY is set.
 * https://developer.flutterwave.com/docs
 */
import type { PaymentGateway, InitializeRequest, InitializeResult, VerifyResult } from "./types";

const API = "https://api.flutterwave.com/v3";

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY ?? ""}`,
  };
}

export class FlutterwaveGateway implements PaymentGateway {
  readonly name = "FLUTTERWAVE";

  async initialize(input: InitializeRequest): Promise<InitializeResult> {
    const res = await fetch(`${API}/payments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: "NGN",
        redirect_url: process.env.FLUTTERWAVE_CALLBACK_URL ?? "http://localhost:3000/wallet",
        customer: { email: input.email, name: input.metadata?.fullName },
        meta: { user_id: input.userId },
      }),
    });
    const body = await res.json();
    if (!res.ok || body.status !== "success") {
      throw new Error(body?.message ?? "Flutterwave initialization failed");
    }
    return { reference: input.reference, gateway: "FLUTTERWAVE", authUrl: body.data.link };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${API}/transactions/verify_by_reference?tx_ref=${reference}`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    if (!res.ok || body.status !== "success" || !body.data) {
      return { reference, status: "FAILED", amount: 0, message: body?.message ?? "Could not verify payment" };
    }
    const data = body.data[0] ?? body.data;
    const success = data.status === "successful" || data.status === "completed";
    return {
      reference,
      status: success ? "SUCCESSFUL" : "FAILED",
      amount: Number(data.amount ?? 0),
      gatewayRef: data.id ? String(data.id) : undefined,
      message: data.processor_response,
    };
  }
}