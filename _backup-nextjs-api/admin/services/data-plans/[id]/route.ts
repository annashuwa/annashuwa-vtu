import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.network === "string") data.network = body.network;
    if (typeof body.planName === "string") data.planName = body.planName;
    if (typeof body.size === "string") data.size = body.size;
    if (typeof body.validity === "string") data.validity = body.validity;
    if (typeof body.price === "number") data.price = body.price;
    if (typeof body.oldPrice === "number") data.oldPrice = body.oldPrice;
    if (typeof body.kind === "string") data.kind = body.kind;

    const plan = await prisma.dataPlan.update({ where: { id }, data });
    return NextResponse.json({ plan: { ...plan, price: plan.price.toString() } });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.dataPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}