import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ApiError, asyncHandler } from "../lib/errors";
import { validate, parseQueryInt } from "../middleware/validate";
import { requireUser } from "../middleware/auth";
import { listUserTransactions, getTransactionByReference } from "../services/transaction.service";
import { listNotifications, unreadCount, markAllRead } from "../services/notification.service";
import { serializeTxn, serializeTxnCard, serializeUser } from "../lib/serialize";
import { changePassword } from "../services/password.service";
import { createAuditLog } from "../lib/audit";
import { clearSessionCookie } from "../lib/jwt";
import { User } from "../models";
import { getKycStatus, submitKyc } from "../services/kyc.service";
import { kycSchema } from "../lib/validators";

const router = Router();

const userPasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const profilePatchSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters").max(80).optional(),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .max(15)
    .regex(/^\+?[\d\s-]+$/, "Enter a valid phone number")
    .optional(),
});

// ---------- Transactions ----------

router.get(
  "/transactions",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseQueryInt(req.query?.page, 1);
    const pageSize = parseQueryInt(req.query?.pageSize, 10, 5, 50);
    const result = await listUserTransactions(req.auth!.userId, {
      search: typeof req.query?.search === "string" ? req.query.search : undefined,
      serviceType: typeof req.query?.serviceType === "string" ? req.query.serviceType : undefined,
      status: typeof req.query?.status === "string" ? req.query.status : undefined,
      from: typeof req.query?.from === "string" ? req.query.from : undefined,
      to: typeof req.query?.to === "string" ? req.query.to : undefined,
      page,
      pageSize,
    });
    res.json({
      items: result.items.map((t) =>
        serializeTxnCard({ id: t._id, reference: t.reference, serviceType: t.serviceType, provider: t.provider, customerInfo: t.customerInfo, amount: t.amount, fee: t.fee, status: t.status, description: t.description, paymentMethod: t.paymentMethod, createdAt: t.createdAt })
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  })
);

router.get(
  "/transactions/:reference",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const found = await getTransactionByReference(req.params.reference, req.auth!.userId);
    if (!found) {
      throw new ApiError(404, "Transaction not found", "NOT_FOUND");
    }
    const user = await User.findById(found.txn.userId).lean();
    res.json({
      transaction: {
        ...serializeTxn({
          id: found.txn._id,
          reference: found.txn.reference,
          serviceType: found.txn.serviceType,
          provider: found.txn.provider,
          customerInfo: found.txn.customerInfo,
          amount: found.txn.amount,
          fee: found.txn.fee,
          status: found.txn.status,
          description: found.txn.description,
          paymentMethod: found.txn.paymentMethod,
          channel: found.txn.channel,
          metadata: found.txn.metadata,
          createdAt: found.txn.createdAt,
          updatedAt: found.txn.updatedAt,
        }),
        user: user ? { fullName: user.fullName, email: user.email } : { fullName: "", email: "" },
      },
    });
  })
);

// ---------- Notifications ----------

router.get(
  "/notifications",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const [data, unread] = await Promise.all([listNotifications(userId, 20), unreadCount(userId)]);
    res.json({
      data: data.map((n) => ({
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: new Date(n.createdAt).toISOString(),
      })),
      unread,
    });
  })
);

router.post(
  "/notifications/read",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    await markAllRead(req.auth!.userId);
    res.json({ ok: true });
  })
);

// ---------- Profile ----------

router.get(
  "/user/profile",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      user: serializeUser(
        { id: String(req.authUser!._id), fullName: req.authUser!.fullName, email: req.authUser!.email, phone: req.authUser!.phone, role: req.authUser!.role, status: req.authUser!.status, avatar: req.authUser!.avatar, emailVerified: req.authUser!.emailVerified, createdAt: req.authUser!.createdAt },
        req.authWallet
          ? { id: String(req.authWallet._id), balance: req.authWallet.balance, availableBalance: req.authWallet.availableBalance ?? null, pendingBalance: req.authWallet.pendingBalance ?? null, currency: req.authWallet.currency, updatedAt: req.authWallet.updatedAt }
          : null
      ),
    });
  })
);

router.patch(
  "/user/profile",
  requireUser,
  validate(profilePatchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { fullName?: string; phone?: string };
    if (body.phone) {
      const taken = await User.exists({ phone: body.phone, _id: { $ne: req.authUser!._id } });
      if (taken) {
        throw new ApiError(409, "This phone number is already in use");
      }
    }
    const updated = await User.findByIdAndUpdate(
      req.auth!.userId,
      {
        $set: {
          ...(body.fullName ? { fullName: body.fullName.trim() } : {}),
          ...(body.phone ? { phone: body.phone.trim() } : {}),
        },
      },
      { new: true }
    );
    await createAuditLog({ userId: req.auth!.userId, action: "PROFILE_UPDATE", req });
    const wallet = req.authWallet;
    res.json({
      user: serializeUser(
        { id: String(updated!._id), fullName: updated!.fullName, email: updated!.email, phone: updated!.phone, role: updated!.role, status: updated!.status, avatar: updated!.avatar, emailVerified: updated!.emailVerified, createdAt: updated!.createdAt },
        wallet
          ? { id: String(wallet._id), balance: wallet.balance, availableBalance: wallet.availableBalance, pendingBalance: wallet.pendingBalance, currency: wallet.currency, updatedAt: wallet.updatedAt }
          : null
      ),
    });
  })
);

router.post(
  "/user/password",
  requireUser,
  validate(userPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { currentPassword: string; newPassword: string };
    const result = await changePassword(req.auth!.userId, body.currentPassword, body.newPassword, req);
    clearSessionCookie(res);
    res.json(result);
  })
);

// ---------- KYC ----------

router.get(
  "/user/kyc",
  requireUser,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getKycStatus(req.auth!.userId);
    if (!result) throw new ApiError(404, "User not found", "NOT_FOUND");
    res.json(result);
  })
);

router.post(
  "/user/kyc",
  requireUser,
  validate(kycSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { idType: string; idNumber: string; documentUrl?: string };
    const result = await submitKyc(req.auth!.userId, body, req);
    res.json(result);
  })
);

export default router;