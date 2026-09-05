import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const providers = await prisma.serviceProvider.findMany({
      where: { category: "ELECTRICITY", isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        fee: p.fee.toString(),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}