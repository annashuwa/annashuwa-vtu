import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const providers = await prisma.serviceProvider.findMany({
      where: { category: "CABLE", isActive: true },
      orderBy: { name: "asc" },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
      },
    });
    return NextResponse.json({
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        packages: p.packages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price.toString(),
          oldPrice: pkg.oldPrice?.toString() ?? null,
          duration: pkg.duration,
        })),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}