import { NextResponse } from "next/server";
import { requireUser, jsonError, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, clearSessionCookie } from "@/lib/auth";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input", "VALIDATION_ERROR");
    }
    if (!(await verifyPassword(parsed.data.currentPassword, user.password))) {
      throw new ApiError(400, "Current password is incorrect", "INVALID_PASSWORD");
    }
    const hashed = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    await createAuditLog({ userId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id });
    const res = NextResponse.json({ message: "Password changed successfully" });
    clearSessionCookie(res);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}