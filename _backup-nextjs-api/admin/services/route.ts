import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? undefined;
    const providers = await prisma.serviceProvider.findMany({
      where: category ? { category } : {},
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { packages: { orderBy: { price: "asc" } } },
    });
    return NextResponse.json({
      providers: providers.map((p) => ({
        id: p.id,
        category: p.category,
        name: p.name,
        code: p.code,
        description: p.description,
        fee: p.fee.toString(),
        isActive: p.isActive,
        packages: p.packages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price.toString(),
          duration: pkg.duration,
          isActive: pkg.isActive,
        })),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}