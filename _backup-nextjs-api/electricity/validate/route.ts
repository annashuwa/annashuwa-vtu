import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { electricityValidateSchema } from "@/lib/validators";
import { getVtuProvider } from "@/services/vtu";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = electricityValidateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
    }
    const { provider, meterNumber, meterType } = parsed.data;
    const providerRec = await prisma.serviceProvider.findFirst({
      where: { code: provider, category: "ELECTRICITY", isActive: true },
    });
    if (!providerRec) {
      throw new ApiError(404, "Electricity provider not found.", "PROVIDER_NOT_FOUND");
    }
    const vtu = getVtuProvider();
    const lookup = await vtu.lookupMeter({ providerCode: providerRec.code, meterNumber, meterType });
    if (!lookup.success) {
      throw new ApiError(400, lookup.message ?? "Meter validation failed", "VALIDATION_FAILED");
    }
    return NextResponse.json({ name: lookup.name, address: lookup.address });
  } catch (err) {
    return jsonError(err);
  }
}