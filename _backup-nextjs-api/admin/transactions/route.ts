import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/auth";
import { listAllTransactions } from "@/services/transaction.service";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const serviceType = searchParams.get("serviceType") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const [items, total] = await listAllTransactions({ search, serviceType, status, from, to, page, pageSize });

    return NextResponse.json({
      items: items.map((t) => ({
        id: t.id,
        reference: t.reference,
        serviceType: t.serviceType,
        provider: t.provider,
        customerInfo: t.customerInfo,
        amount: t.amount.toString(),
        fee: t.fee.toString(),
        status: t.status,
        description: t.description,
        paymentMethod: t.paymentMethod,
        user: t.user.fullName,
        userEmail: t.user.email,
        userId: t.userId,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    return jsonError(err);
  }
}