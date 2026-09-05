import { MONNIFY_CONTRACT_CODE, MONNIFY_SECRET_KEY } from "../../config";
import { ApiError } from "../../lib/errors";
import type { PaymentGateway, InitializeRequest, InitializeResult, VerifyResult } from "./types";

/**
 * Monnify gateway. Performs the client-credential OAuth flow to obtain an
 * access token, then initialises a reserved-account-free standard payment.
 */
export class MonnifyGateway implements PaymentGateway {
  readonly name = "MONNIFY";
  private cachedToken: string | null = null;

  private async token(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;
    if (!MONNIFY_SECRET_KEY) throw new Error("MONNIFY_SECRET_KEY is not set");
    const res = await fetch(
      `https://api.monnify.com/api/v1/auth/login`,
      { headers: { Authorization: `Basic ${Buffer.from(MONNIFY_SECRET_KEY).toString("base64")}` } }
    );
    const data = (await res.json()) as Record<string, unknown>;
    const body = (data.responseBody as Record<string, unknown>) ?? {};
    const token = (body.accessToken as string) ?? "";
    if (!token) throw new Error("Monnify auth failed");
    this.cachedToken = token;
    return token;
  }

  async initialize(input: InitializeRequest): Promise<InitializeResult> {
    const token = await this.token();
    if (!MONNIFY_CONTRACT_CODE) throw new Error("MONNIFY_CONTRACT_CODE is not set");
    const res = await fetch("https://api.monnify.com/api/v2/merchant/transactions/init-transaction", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount,
        customerName: (input.metadata?.fullName as string) ?? "ANNASHUWA User",
        customerEmail: input.email,
        paymentReference: input.reference,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
        currencyCode: "NGN",
        contractCode: MONNIFY_CONTRACT_CODE,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/wallet`,
        incomeSplitConfig: [],
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    const body = (data.responseBody as Record<string, unknown>) ?? {};
    if (data.requestSuccessful !== true) {
      throw new ApiError(502, (data.responseMessage as string) ?? "Monnify initialization failed", "PAYMENT_ERROR");
    }
    return {
      reference: (body.paymentReference as string) ?? input.reference,
      gateway: "MONNIFY",
      authUrl: (body.checkoutUrl as string) ?? undefined,
      message: (data.responseMessage as string) ?? undefined,
    };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const token = await this.token();
    const res = await fetch(
      `https://api.monnify.com/api/v2/merchant/transactions/query?paymentReference=${reference}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = (await res.json()) as Record<string, unknown>;
    const body = (data.responseBody as Record<string, unknown>) ?? {};
    const status = String(body.paymentStatus ?? "");
    return {
      reference,
      status: status === "PAID" ? "SUCCESSFUL" : "FAILED",
      amount: Number(body.amount ?? 0),
      gatewayRef: (body.transactionReference as string) ?? reference,
    };
  }
}