import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, attachTokenToBody, jsonError, ApiError } from "@/lib/auth";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { serializeUser } from "@/lib/serialize";

export async function POST(req: Request) {
  try {
    if (!rateLimit(getClientId(req, "login"), 10, 60)) {
      throw new ApiError(429, "Too many login attempts. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "Enter a valid email and password.", "VALIDATION_ERROR");
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
    if (!user || !(await verifyPassword(password, user.password))) {
      throw new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }
    if (user.status === "SUSPENDED") {
      throw new ApiError(403, "This account has been suspended. Contact support.", "ACCOUNT_SUSPENDED");
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const res = NextResponse.json({ message: "Login successful", user: serializeUser(user) });
    const token = await setSessionCookie(res, {
      sub: user.id,
      role: user.role,
      name: user.fullName,
      email: user.email,
    });
    await createAuditLog({ userId: user.id, action: "AUTH_LOGIN", entityType: "User", entityId: user.id });
    return attachTokenToBody(res, token);
  } catch (err) {
    return jsonError(err);
  }
}