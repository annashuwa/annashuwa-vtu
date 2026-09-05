import { NextResponse } from "next/server";
import { requireAdmin, jsonError, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminServiceSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = adminServiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid provider", "VALIDATION_ERROR");
    }
    const provider = await prisma.serviceProvider.create({ data: parsed.data });
    return NextResponse.json({ provider }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}