import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.examPinProduct.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    });
    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price.toString(),
        costPrice: p.costPrice?.toString() ?? null,
        description: p.description,
        soldCount: p.soldCount,
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}