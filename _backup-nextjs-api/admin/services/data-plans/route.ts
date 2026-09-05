import { NextResponse } from "next/server";
import { requireAdmin, jsonError, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminDataPlanSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const plans = await prisma.dataPlan.findMany({ orderBy: [{ network: "asc" }, { price: "asc" }] });
    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        network: p.network,
        planName: p.planName,
        size: p.size,
        validity: p.validity,
        price: p.price.toString(),
        oldPrice: p.oldPrice?.toString() ?? null,
        kind: p.kind,
        isActive: p.isActive,
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = adminDataPlanSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid data plan", "VALIDATION_ERROR");
    }
    const plan = await prisma.dataPlan.create({ data: parsed.data });
    return NextResponse.json({ plan: { ...plan, price: plan.price.toString() } }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}