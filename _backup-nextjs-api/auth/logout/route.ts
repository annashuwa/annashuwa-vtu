import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser, jsonError } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      await createAuditLog({ userId: user.id, action: "AUTH_LOGOUT", entityType: "User", entityId: user.id });
    }
    const res = NextResponse.json({ message: "Logged out" });
    clearSessionCookie(res);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET() {
  const res = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  clearSessionCookie(res);
  return res;
}