import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NETWORK_CODES } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const network = searchParams.get("network");
    const plans = await prisma.dataPlan.findMany({
      where: {
        isActive: true,
        ...(network ? { network } : {}),
      },
      orderBy: [{ network: "asc" }, { price: "asc" }],
    });
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
      })),
      networks: NETWORK_CODES,
    });
  } catch (err) {
    return jsonError(err);
  }
}