import { NextResponse } from "next/server";
import { requireAdmin, jsonError, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminUserStatusSchema, adminWalletSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";
import { generateReference } from "@/lib/utils";
import { createNotification } from "@/services/notification.service";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    if (body.status) {
      const parsed = adminUserStatusSchema.safeParse(body);
      if (!parsed.success) throw new ApiError(400, "Invalid status", "VALIDATION_ERROR");
      const user = await prisma.user.update({ where: { id }, data: { status: parsed.data.status } });
      await createNotification({
        userId: user.id,
        title: user.status === "ACTIVE" ? "Account activated" : "Account suspended",
        message:
          user.status === "ACTIVE"
            ? "Your ANNASHUWA VTU account has been activated."
            : "Your ANNASHUWA VTU account has been suspended. Contact support.",
        type: user.status === "ACTIVE" ? "SUCCESS" : "ERROR",
      });
      await createAuditLog({
        userId: admin.id,
        action: "ADMIN_SET_USER_STATUS",
        entityType: "User",
        entityId: id,
        details: { status: parsed.data.status },
      });
      return NextResponse.json({ status: user.status });
    }

    if (body.walletAdjust) {
      const parsed = adminWalletSchema.safeParse(body.walletAdjust);
      if (!parsed.success) throw new ApiError(400, "Invalid wallet adjustment", "VALIDATION_ERROR");
      const { amount, type, reason } = parsed.data;
      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: id } });
      const delta = type === "CREDIT" ? amount : -amount;
      const newBalance = Number(wallet.balance) + delta;
      if (newBalance < 0) throw new ApiError(400, "Adjustment would make balance negative");

      await prisma.$transaction([
        prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: delta } } }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: id,
            type: "ADJUSTMENT",
            amount: delta,
            balanceAfter: newBalance,
            status: "SUCCESSFUL",
            reference: generateReference("ADJ"),
            description: `Admin ${type === "CREDIT" ? "credit" : "debit"} (${reason})`,
          },
        }),
      ]);
      await createAuditLog({
        userId: admin.id,
        action: `ADMIN_WALLET_${type}`,
        entityType: "User",
        entityId: id,
        details: { amount, reason },
      });
      await createNotification({
        userId: id,
        title: "Wallet updated",
        message: `Your wallet was ${type === "CREDIT" ? "credited" : "debited"} with ₦${amount}. ${reason}`,
        type: "INFO",
      });
      return NextResponse.json({ newBalance });
    }

    return NextResponse.json({ error: "No valid operation provided" }, { status: 400 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        transactions: { orderBy: { createdAt: "desc" }, take: 20 },
        walletTransaction: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        walletBalance: user.wallet?.balance.toString() ?? "0",
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
      transactions: user.transactions.map((t) => ({
        id: t.id,
        reference: t.reference,
        serviceType: t.serviceType,
        provider: t.provider,
        amount: t.amount.toString(),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      walletTransactions: user.walletTransaction.map((w) => ({
        id: w.id,
        type: w.type,
        amount: w.amount.toString(),
        status: w.status,
        reference: w.reference,
        createdAt: w.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}