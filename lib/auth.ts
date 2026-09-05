import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { UserProfile } from "@/types";

export const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export const SESSION_COOKIE = "ans_session";
const isSecureContext = /^https:/.test(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production"
);

export type SessionPayload = {
  sub: string;
  role: string;
  name: string;
  email: string;
};

const issuer = "annashuwa-vtu";
const audience = "annashuwa-vtu-web";

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer, audience });
    return {
      sub: payload.sub as string,
      role: (payload.role as string) ?? "USER",
      name: (payload.name as string) ?? "",
      email: (payload.email as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const h = await headers();
  const bearer = h.get("authorization");
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7);
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<UserProfile | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { user?: UserProfile | null };
    if (!body.user || body.user.status !== "ACTIVE") return null;
    return body.user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "You must be logged in to perform this action.");
  }
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "You must be logged in to perform this action.");
  }
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "You do not have permission to access this resource.");
  }
  return user;
}

export async function setSessionCookie(response: NextResponse, payload: SessionPayload): Promise<string> {
  const token = await signSession(payload);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureContext,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

/**
 * Attaches the signed JWT to the response body as `token` so native clients
 * (which have no cookie jar) can persist it and send `Authorization: Bearer`.
 * Preserves existing headers (including the Set-Cookie) and status.
 */
export async function attachTokenToBody(response: NextResponse, token: string): Promise<NextResponse> {
  const body = await response.json();
  return NextResponse.json({ ...body, token }, { status: response.status, headers: response.headers });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isSecureContext,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "API_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error("[api-error]", error);
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}