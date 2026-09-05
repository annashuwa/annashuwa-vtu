import jwt from "jsonwebtoken";
import {
  JWT_AUDIENCE,
  JWT_EXPIRES_IN,
  JWT_ISSUER,
  JWT_SECRET,
  SESSION_COOKIE,
  secureCookies,
} from "../config";
import type { Response } from "express";

export interface SessionPayload {
  sub: string;
  role: string;
  name: string;
  email: string;
}

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as jwt.JwtPayload;
    if (!decoded?.sub) return null;
    return {
      sub: String(decoded.sub),
      role: String(decoded.role ?? "USER"),
      name: String(decoded.name ?? ""),
      email: String(decoded.email ?? ""),
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function setCookie(res: Response, name: string, value: string, maxAgeMs: number) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
}

export function clearCookie(res: Response, name: string) {
  res.clearCookie(name, { path: "/" });
}