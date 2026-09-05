import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";
import { verifySession } from "../lib/jwt";
import { SESSION_COOKIE } from "../config";
import { loadSession } from "../services/auth.service";

export interface SessionContext {
  payload: { userId: string; role: string; name: string; email: string };
  user: NonNullable<Awaited<ReturnType<typeof loadSession>>>["user"];
  wallet: NonNullable<Awaited<ReturnType<typeof loadSession>>>["wallet"];
}

export async function getSessionUser(req: Request): Promise<SessionContext | null> {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? null;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  const session = await loadSession(payload.sub);
  if (!session) return null;

  return {
    payload: { userId: payload.sub, role: payload.role, name: payload.name, email: payload.email },
    user: session.user,
    wallet: session.wallet,
  };
}

export function requireUser(req: Request, _res: Response, next: NextFunction) {
  getSessionUser(req)
    .then((session) => {
      if (!session) {
        throw new ApiError(401, "You must be logged in to perform this action.");
      }
      req.auth = session.payload;
      req.authUser = session.user;
      req.authWallet = session.wallet ?? null;
      next();
    })
    .catch(next);
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  getSessionUser(req)
    .then((session) => {
      if (!session) {
        throw new ApiError(401, "You must be logged in to perform this action.");
      }
      // Enforce the live DB role in addition to the JWT claim so a demoted
      // admin loses admin access immediately instead of at token expiry.
      if (session.payload.role !== "ADMIN" || session.user.role !== "ADMIN") {
        throw new ApiError(403, "You do not have permission to access this resource.", "API_ERROR");
      }
      req.auth = session.payload;
      req.authUser = session.user;
      req.authWallet = session.wallet ?? null;
      next();
    })
    .catch(next);
}