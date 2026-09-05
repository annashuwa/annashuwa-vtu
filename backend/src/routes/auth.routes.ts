import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ApiError, asyncHandler } from "../lib/errors";
import { rateLimit } from "../lib/rate-limit";
import { validate } from "../middleware/validate";
import { getSessionUser } from "../middleware/auth";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, usernameSchema } from "../lib/validators";
import { registerUser, loginUser, loadSession } from "../services/auth.service";
import { handleForgotPassword, handleResetPassword } from "../services/password.service";
import { createAuditLog } from "../lib/audit";
import { signSession, setSessionCookie, clearSessionCookie, setCookie, clearCookie } from "../lib/jwt";
import { serializeUser } from "../lib/serialize";
import { REFRESH_COOKIE, APP_URL } from "../config";
import { rotateRefreshToken } from "../services/refresh-token.service";

const router = Router();

router.post(
  "/register",
  rateLimit("register"),
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof registerSchema> & { username?: string };
    if (body.username) {
      const u = usernameSchema.safeParse(body.username);
      if (!u.success) {
        throw new ApiError(400, u.error.issues[0]?.message ?? "Invalid username", "VALIDATION_ERROR");
      }
    }
    const { user, wallet } = await registerUser(body);
    await createAuditLog({ userId: user._id, action: "AUTH_REGISTER", entityType: "User", entityId: user._id, req });
    const token = signSession({ sub: String(user._id), role: user.role, name: user.fullName, email: user.email });
    setSessionCookie(res, token);
    res.status(201).json({
      message: "Account created successfully",
      user: serializeUser(
        { id: String(user._id), fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, status: user.status, avatar: user.avatar, emailVerified: user.emailVerified, createdAt: user.createdAt },
        { id: String(wallet._id), balance: wallet.balance, availableBalance: wallet.availableBalance, pendingBalance: wallet.pendingBalance, currency: wallet.currency, updatedAt: wallet.updatedAt }
      ),
      token,
    });
  })
);

router.post(
  "/login",
  rateLimit("login"),
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof loginSchema>;
    const { user, wallet } = await loginUser(body.email, body.password);
    await createAuditLog({ userId: user._id, action: "AUTH_LOGIN", entityType: "User", entityId: user._id, req });
    const token = signSession({ sub: String(user._id), role: user.role, name: user.fullName, email: user.email });
    setSessionCookie(res, token);
    res.json({
      message: "Login successful",
      user: serializeUser(
        { id: String(user._id), fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, status: user.status, avatar: user.avatar, emailVerified: user.emailVerified, createdAt: user.createdAt },
        wallet
          ? { id: String(wallet._id), balance: wallet.balance, availableBalance: wallet.availableBalance, pendingBalance: wallet.pendingBalance, currency: wallet.currency, updatedAt: wallet.updatedAt }
          : null
      ),
      token,
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req: Request, res: Response) => {
    const session = await getSessionUser(req);
    if (session) {
      await createAuditLog({ userId: session.user._id, action: "AUTH_LOGOUT", entityType: "User", entityId: session.user._id, req });
    }
    clearSessionCookie(res);
    res.json({ message: "Logged out" });
  })
);

router.get("/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.redirect(`${APP_URL}/login`);
});

router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const session = await getSessionUser(req);
    if (!session) {
      res.json({ user: null });
      return;
    }
    res.json({
      user: serializeUser(
        { id: String(session.user._id), fullName: session.user.fullName, email: session.user.email, phone: session.user.phone, role: session.user.role, status: session.user.status, avatar: session.user.avatar, emailVerified: session.user.emailVerified, createdAt: session.user.createdAt },
        session.wallet
          ? { id: String(session.wallet._id), balance: session.wallet.balance, currency: session.wallet.currency, updatedAt: session.wallet.updatedAt }
          : null
      ),
    });
  })
);

router.post(
  "/forgot-password",
  rateLimit("forgot-password"),
  validate(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof forgotPasswordSchema>;
    const result = await handleForgotPassword(body.email, req);
    res.json(result);
  })
);

router.post(
  "/reset-password",
  rateLimit("reset-password"),
  validate(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof resetPasswordSchema>;
    const result = await handleResetPassword(body.token, body.password, req);
    clearSessionCookie(res);
    res.json(result);
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : null;
    const cookieToken = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null;
    const raw = bodyToken ?? cookieToken;
    if (!raw) {
      throw new ApiError(401, "Missing refresh token.", "INVALID_REFRESH_TOKEN");
    }
    const { userId, newToken } = await rotateRefreshToken(raw);
    const session = await loadSession(userId);
    if (!session) {
      throw new ApiError(401, "Invalid or expired refresh token.", "INVALID_REFRESH_TOKEN");
    }
    const authToken = signSession({
      sub: String(session.user._id),
      role: session.user.role,
      name: session.user.fullName,
      email: session.user.email,
    });
    setSessionCookie(res, authToken);
    setCookie(res, REFRESH_COOKIE, newToken, 30 * 24 * 60 * 60 * 1000);
    res.json({ token: authToken, refreshToken: newToken, message: "Session refreshed" });
  })
);

router.post(
  "/revoke",
  asyncHandler(async (_req: Request, res: Response) => {
    clearCookie(res, REFRESH_COOKIE);
    res.json({ ok: true });
  })
);

export default router;