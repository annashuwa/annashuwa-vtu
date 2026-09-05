/**
 * Paystack gateway adapter. Active when PAYSTACK_SECRET_KEY is set.
 * https://paystack.com/docs/api
 */
import type { PaymentGateway, InitializeRequest, InitializeResult, VerifyResult } from "./types";

const API = "https://api.paystack.co";

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY ?? ""}`,
  };
}

export class PaystackGateway implements PaymentGateway {
  readonly name = "PAYSTACK";

  async initialize(input: InitializeRequest): Promise<InitializeResult> {
    const res = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        reference: input.reference,
        callback_url: process.env.PAYSTACK_CALLBACK_URL ?? "http://localhost:3000/wallet",
        metadata: {
          user_id: input.userId,
          ...(input.metadata ?? {}),
        },
      }),
    });
    const body = await res.json();
    if (!res.ok || !body?.status) {
      throw new Error(body?.message ?? "Paystack initialization failed");
    }
    return { reference: input.reference, gateway: "PAYSTACK", authUrl: body.data.authorization_url };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${API}/transaction/verify/${reference}`, { headers: authHeaders() });
    const body = await res.json();
    if (!res.ok || !body?.status) {
      return { reference, status: "FAILED", amount: 0, message: body?.message ?? "Could not verify payment" };
    }
    const data = body.data;
    const success = data.status === "success";
    return {
      reference,
      status: success ? "SUCCESSFUL" : "FAILED",
      amount: Number(data.amount) / 100,
      gatewayRef: data.id ? String(data.id) : undefined,
      message: data.gateway_response,
    };
  }
}