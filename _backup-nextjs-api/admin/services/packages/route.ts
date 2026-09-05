import { NextResponse } from "next/server";
import { requireAdmin, jsonError, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body?.providerId || !body?.name || typeof body?.price !== "number") {
      throw new ApiError(400, "providerId, name and price are required", "VALIDATION_ERROR");
    }
    const pkg = await prisma.servicePackage.create({
      data: {
        providerId: body.providerId,
        name: body.name,
        price: body.price,
        oldPrice: typeof body.oldPrice === "number" ? body.oldPrice : undefined,
        duration: body.duration,
        description: body.description,
      },
    });
    return NextResponse.json({ pkg }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body?.id) throw new ApiError(400, "package id is required", "VALIDATION_ERROR");
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.price === "number") data.price = body.price;
    if (typeof body.oldPrice === "number") data.oldPrice = body.oldPrice;
    if (typeof body.duration === "string") data.duration = body.duration;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    const pkg = await prisma.servicePackage.update({ where: { id: body.id }, data });
    return NextResponse.json({ pkg });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    await prisma.servicePackage.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}