import { NextResponse } from "next/server";
import crypto from "crypto";
import { resetPasswordSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { hashPassword, jsonError, ApiError } from "@/lib/auth";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/services/notification.service";

export async function POST(req: Request) {
  try {
    if (!rateLimit(getClientId(req, "reset-password"), 5, 300)) {
      throw new ApiError(429, "Too many requests. Please wait a few minutes.");
    }
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "Password must be at least 8 characters and match.", "VALIDATION_ERROR");
    }
    const { token, password } = parsed.data;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new ApiError(400, "This reset link is invalid or has expired. Please request a new one.", "INVALID_TOKEN");
    }

    const hashed = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, used: false },
        data: { used: true },
      }),
    ]);

    await createNotification({
      userId: record.userId,
      title: "Password changed",
      message: "Your password has been reset successfully. You can now sign in.",
      type: "SUCCESS",
    });
    await createAuditLog({ userId: record.userId, action: "AUTH_PASSWORD_RESET", entityType: "User", entityId: record.userId });

    return NextResponse.json({ message: "Password reset successful. You can now sign in." });
  } catch (err) {
    return jsonError(err);
  }
}