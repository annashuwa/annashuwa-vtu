import { NextResponse } from "next/server";
import { requireAdmin, jsonError, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminExamPinSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const products = await prisma.examPinProduct.findMany({ orderBy: { category: "asc" } });
    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price.toString(),
        costPrice: p.costPrice?.toString() ?? null,
        description: p.description,
        isActive: p.isActive,
        soldCount: p.soldCount,
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
    const parsed = adminExamPinSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid product", "VALIDATION_ERROR");
    }
    const product = await prisma.examPinProduct.create({ data: parsed.data });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body?.id) throw new ApiError(400, "product id is required", "VALIDATION_ERROR");
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.category === "string") data.category = body.category;
    if (typeof body.price === "number") data.price = body.price;
    if (typeof body.costPrice === "number") data.costPrice = body.costPrice;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    const product = await prisma.examPinProduct.update({ where: { id: body.id }, data });
    return NextResponse.json({ product });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    await prisma.examPinProduct.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}