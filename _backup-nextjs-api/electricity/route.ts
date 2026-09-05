import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { electricitySchema } from "@/lib/validators";
import { executePurchase } from "@/services/purchase.service";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import type { VtuResponse } from "@/services/vtu/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(getClientId(req, "electricity"), 10, 60)) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = electricitySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
    }
    const { provider, meterNumber, meterType, amount } = parsed.data;
    const providerRec = await prisma.serviceProvider.findFirst({
      where: { code: provider, category: "ELECTRICITY", isActive: true },
    });
    if (!providerRec) {
      throw new ApiError(404, "Electricity provider not found.", "PROVIDER_NOT_FOUND");
    }
    const fee = Number(providerRec.fee);

    const result = await executePurchase({
      userId: user.id,
      serviceType: "ELECTRICITY",
      provider: providerRec.name,
      customerInfo: meterNumber,
      amount,
      fee,
      description: `${providerRec.name} ${meterType} payment for meter ${meterNumber}`,
      metadata: { provider: providerRec.code, meterNumber, meterType },
      execute: (vtu) =>
        vtu.buyElectricity({
          providerCode: providerRec.code,
          meterNumber,
          meterType,
          amount,
        }),
    });

    return NextResponse.json({
      transaction: result.transaction,
      providerResponse: result.providerResponse as VtuResponse,
    });
  } catch (err) {
    return jsonError(err);
  }
}