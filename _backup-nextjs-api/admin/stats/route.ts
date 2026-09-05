import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const [totalUsers, activeUsers, suspendedUsers, totalTransactions, successfulTransactions, failedTransactions, pendingTransactions, recent7Txns, sums, volumeByService, recentUsers, recentTxns] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { status: "SUSPENDED" } }),
        prisma.transaction.count(),
        prisma.transaction.count({ where: { status: "SUCCESSFUL" } }),
        prisma.transaction.count({ where: { status: "FAILED" } }),
        prisma.transaction.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
        prisma.transaction.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
          select: { status: true, amount: true, createdAt: true },
        }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: "SUCCESSFUL" } }),
        prisma.transaction.groupBy({ by: ["serviceType"], _sum: { amount: true }, _count: true }),
        prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { fullName: true, email: true } } } }),
      ]);

    const volumeByDay = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.now() - (6 - i) * 864e5);
      const key = day.toISOString().slice(0, 10);
      const items = recent7Txns.filter((t) => t.createdAt.toISOString().slice(0, 10) === key);
      return {
        day: day.toLocaleDateString("en-NG", { weekday: "short" }),
        successful: items.filter((t) => t.status === "SUCCESSFUL").reduce((s, t) => s + Number(t.amount), 0)
          .toFixed(2),
        failed: items.filter((t) => t.status === "FAILED").reduce((s, t) => s + Number(t.amount), 0).toFixed(2),
        pending: items.filter((t) => t.status === "PENDING" || t.status === "PROCESSING")
          .reduce((s, t) => s + Number(t.amount), 0)
          .toFixed(2),
      };
    });

    return NextResponse.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      totalRevenue: Number(sums._sum.amount ?? 0).toFixed(2),
      volumeByDay,
      volumeByService: volumeByService.map((v) => ({
        serviceType: v.serviceType,
        total: v._sum.amount?.toString() ?? "0",
        count: v._count,
      })),
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
      })),
      recentTransactions: recentTxns.map((t) => ({
        id: t.id,
        reference: t.reference,
        serviceType: t.serviceType,
        provider: t.provider,
        amount: t.amount.toString(),
        status: t.status,
        user: t.user.fullName,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}