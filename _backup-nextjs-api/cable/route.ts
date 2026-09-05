import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { cableSchema } from "@/lib/validators";
import { executePurchase } from "@/services/purchase.service";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import type { VtuResponse } from "@/services/vtu/types";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(getClientId(req, "cable"), 10, 60)) {
      throw new ApiError(429, "Too many requests. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = cableSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
    }
    const { provider, smartCard, packageId, phone } = parsed.data;
    const providerRec = await prisma.serviceProvider.findFirst({
      where: { code: provider, category: "CABLE", isActive: true },
      include: { packages: true },
    });
    if (!providerRec) {
      throw new ApiError(404, "Cable provider not found.", "PROVIDER_NOT_FOUND");
    }
    const pkg = providerRec.packages.find((p) => p.id === packageId);
    if (!pkg || !pkg.isActive) {
      throw new ApiError(404, "Package not found or unavailable.", "PACKAGE_NOT_FOUND");
    }
    const fee = Number(providerRec.fee);

    const result = await executePurchase({
      userId: user.id,
      serviceType: "CABLE",
      provider: providerRec.name,
      customerInfo: smartCard,
      amount: Number(pkg.price),
      fee,
      description: `${providerRec.name} ${pkg.name} subscription for smart card ${smartCard}`,
      metadata: { provider: providerRec.code, smartCard, package: pkg.name, phone },
      execute: (vtu) =>
        vtu.subscribeCable({
          providerCode: providerRec.code,
          smartCard,
          packageName: pkg.name,
          amount: Number(pkg.price),
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