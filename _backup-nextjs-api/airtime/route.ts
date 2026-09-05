import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { airtimeSchema } from "@/lib/validators";
import { executePurchase } from "@/services/purchase.service";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { NETWORK_CODES } from "@/lib/constants";
import type { VtuResponse } from "@/services/vtu/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(getClientId(req, "airtime"), 10, 60)) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = airtimeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
    }
    const input = parsed.data;
    if (!NETWORK_CODES.includes(input.network as (typeof NETWORK_CODES)[number])) {
      throw new ApiError(400, "Unknown network provider", "VALIDATION_ERROR");
    }

    const result = await executePurchase({
      userId: user.id,
      serviceType: "AIRTIME",
      provider: input.network,
      customerInfo: input.phone,
      amount: input.amount,
      description: `${input.network} airtime of ₦${input.amount} to ${input.phone}`,
      metadata: { network: input.network, phone: input.phone },
      execute: (vtu) => vtu.buyAirtime({ network: input.network, phone: input.phone, amount: input.amount }),
    });

    return NextResponse.json({
      transaction: result.transaction,
      providerResponse: result.providerResponse as VtuResponse,
    });
  } catch (err) {
    return jsonError(err);
  }
}