import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { cableValidateSchema } from "@/lib/validators";
import { getVtuProvider } from "@/services/vtu";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = cableValidateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR");
    }
    const { provider, smartCard } = parsed.data;
    const providerRec = await prisma.serviceProvider.findFirst({
      where: { code: provider, category: "CABLE", isActive: true },
    });
    if (!providerRec) {
      throw new ApiError(404, "Cable provider not found.", "PROVIDER_NOT_FOUND");
    }
    const vtu = getVtuProvider();
    const lookup = await vtu.lookupSmartCard({ providerCode: providerRec.code, smartCard });
    if (!lookup.success) {
      throw new ApiError(400, lookup.message ?? "Smart card validation failed", "VALIDATION_FAILED");
    }
    return NextResponse.json({ name: lookup.name });
  } catch (err) {
    return jsonError(err);
  }
}