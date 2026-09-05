import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { dataSchema } from "@/lib/validators";
import { executePurchase } from "@/services/purchase.service";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import type { VtuResponse } from "@/services/vtu/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(getClientId(req, "data"), 10, 60)) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = dataSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
    }
    const { network, phone, planId } = parsed.data;

    const plan = await prisma.dataPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      throw new ApiError(404, "Data plan not found or unavailable.", "PLAN_NOT_FOUND");
    }
    if (plan.network !== network) {
      throw new ApiError(400, "Plan does not belong to the selected network.", "PLAN_MISMATCH");
    }

    const planPrice = Number(plan.price);
    const result = await executePurchase({
      userId: user.id,
      serviceType: "DATA",
      provider: network,
      customerInfo: phone,
      amount: planPrice,
      description: `${plan.planName} (${plan.size} - ${plan.validity}) to ${phone}`,
      metadata: { network, phone, planId, planName: plan.planName, size: plan.size },
      execute: (vtu) =>
        vtu.buyData({
          network,
          phone,
          planName: plan.planName,
          size: plan.size,
          amount: planPrice,
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