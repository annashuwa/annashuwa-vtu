import { NextResponse } from "next/server";
import crypto from "crypto";
import { forgotPasswordSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { jsonError, ApiError } from "@/lib/auth";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { createNotification } from "@/services/notification.service";

export async function POST(req: Request) {
  try {
    if (!rateLimit(getClientId(req, "forgot-password"), 5, 300)) {
      throw new ApiError(429, "Too many requests. Please wait a few minutes.");
    }
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "Enter a valid email address.", "VALIDATION_ERROR");
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    const isDev = process.env.APP_ENV === "development" || !process.env.APP_ENV;

    if (!user) {
      // Always return a generic response to avoid user enumeration.
      return NextResponse.json({ message: "If an account exists for this email, a reset link has been sent.", devResetLink: isDev ? "" : undefined });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const devResetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    if (process.env.SMTP_HOST) {
      // TODO: wire a real mailer (nodemailer) here.
    } else {
      await createNotification({
        userId: user.id,
        title: "Password reset requested",
        message: "We received a request to reset your password.",
        type: "INFO",
      });
    }

    return NextResponse.json({
      message: "If an account exists for this email, a reset link has been sent.",
      ...(isDev ? { devResetLink } : {}),
    });
  } catch (err) {
    return jsonError(err);
  }
}