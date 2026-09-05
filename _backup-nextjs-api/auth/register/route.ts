import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie, attachTokenToBody, jsonError, ApiError } from "@/lib/auth";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { serializeUser } from "@/lib/serialize";

export async function POST(req: Request) {
  try {
    if (!rateLimit(getClientId(req, "register"), 5, 60)) {
      throw new ApiError(429, "Too many attempts. Please wait a moment.");
    }
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ApiError(400, first?.message ?? "Invalid input", "VALIDATION_ERROR");
    }
    const { fullName, email, phone, password } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      throw new ApiError(409, existing.email === email ? "An account with this email already exists." : "An account with this phone number already exists.", "EMAIL_EXISTS");
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email,
        phone: phone.trim(),
        password: hashed,
        wallet: { create: {} },
      },
      include: { wallet: true },
    });

    const res = NextResponse.json(
      { message: "Account created successfully", user: serializeUser(user) },
      { status: 201 }
    );
    const payload = { sub: user.id, role: user.role, name: user.fullName, email: user.email };
    const token = await setSessionCookie(res, payload);
    await createAuditLog({ userId: user.id, action: "AUTH_REGISTER", entityType: "User", entityId: user.id });
    return attachTokenToBody(res, token);
  } catch (err) {
    return jsonError(err);
  }
}