/**
 * Monnify gateway adapter. Active when MONNIFY_SECRET_KEY is set.
 * https://app.monnify.com/developers
 */
import type { PaymentGateway, InitializeRequest, InitializeResult, VerifyResult } from "./types";

const API = "https://api.monnify.com";

async function accessToken(): Promise<string> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.MONNIFY_SECRET_KEY}:${process.env.MONNIFY_PUBLIC_KEY ?? ""}`
      ).toString("base64")}`,
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error("Monnify authentication failed");
  return body.responseBody?.accessToken ?? "";
}

export class MonnifyGateway implements PaymentGateway {
  readonly name = "MONNIFY";

  async initialize(input: InitializeRequest): Promise<InitializeResult> {
    const token = await accessToken();
    const res = await fetch(`${API}/api/v2/merchant/transactions/init-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        amount: input.amount,
        customerName: input.metadata?.fullName,
        customerEmail: input.email,
        paymentReference: input.reference,
        paymentDescription: `Wallet funding for ${input.email}`,
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE ?? "",
        redirectUrl: process.env.MONNIFY_CALLBACK_URL ?? "http://localhost:3000/wallet",
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.requestSuccessful) {
      throw new Error(body.responseMessage ?? "Monnify initialization failed");
    }
    return {
      reference: input.reference,
      gateway: "MONNIFY",
      authUrl: body.responseBody?.checkoutUrl,
      message: body.responseMessage,
    };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const token = await accessToken();
    const res = await fetch(`${API}/api/v2/merchant/transactions/query?paymentReference=${reference}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok || !body.requestSuccessful || !body.responseBody) {
      return { reference, status: "FAILED", amount: 0, message: body.responseMessage ?? "Could not verify payment" };
    }
    const data = body.responseBody;
    const success = data.paymentStatus === "PAID" || data.completed;
    return {
      reference,
      status: success ? "SUCCESSFUL" : "FAILED",
      amount: Number(data.amount ?? 0),
      gatewayRef: data.transactionReference,
      message: data.paymentStatusDescription,
    };
  }
}