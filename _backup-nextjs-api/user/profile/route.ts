import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { serializeUser } from "@/lib/serialize";
import { createAuditLog } from "@/lib/audit";

const updateProfileSchema = z.object({
  fullName: z.string().min(3).max(80).optional(),
  phone: z.string().min(10).max(15).regex(/^\+?[\d\s-]+$/).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user: serializeUser(user) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid profile data", "VALIDATION_ERROR");
    }
    const data: Record<string, string> = {};
    const { fullName, phone } = parsed.data;
    if (fullName) data.fullName = fullName.trim();
    if (phone) {
      const exists = await prisma.user.findFirst({ where: { phone, NOT: { id: user.id } } });
      if (exists) throw new ApiError(409, "This phone number is already in use");
      data.phone = phone.trim();
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      include: { wallet: true },
    });
    await createAuditLog({ userId: user.id, action: "PROFILE_UPDATE", entityType: "User", entityId: user.id });
    return NextResponse.json({ user: serializeUser(updated) });
  } catch (err) {
    return jsonError(err);
  }
}