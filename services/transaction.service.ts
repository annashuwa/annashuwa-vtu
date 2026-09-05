import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/utils";
import type { ServiceType, TxnStatus } from "@/types";

export type CreateTransactionInput = {
  userId: string;
  serviceType: ServiceType;
  provider: string;
  customerInfo?: string;
  amount: number;
  fee?: number;
  status?: TxnStatus;
  description?: string;
  metadata?: unknown;
  paymentMethod?: string;
  reference?: string;
};

export async function createTransaction(input: CreateTransactionInput) {
  return prisma.transaction.create({
    data: {
      reference: input.reference ?? generateReference(),
      userId: input.userId,
      serviceType: input.serviceType,
      provider: input.provider,
      customerInfo: input.customerInfo,
      amount: input.amount,
      fee: input.fee ?? 0,
      status: input.status ?? "PENDING",
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      paymentMethod: input.paymentMethod,
      channel: "WEB",
    },
  });
}

export async function updateTransactionStatus(
  id: string,
  status: TxnStatus,
  opts?: { apiResponse?: unknown; description?: string }
) {
  return prisma.transaction.update({
    where: { id },
    data: {
      status,
      ...(opts?.apiResponse ? { apiResponse: JSON.stringify(opts.apiResponse) } : {}),
      ...(opts?.description ? { description: opts.description } : {}),
    },
  });
}

export function listUserTransactions(userId: string, opts?: {
  search?: string;
  serviceType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, opts?.pageSize ?? 10));
  const where: Record<string, unknown> = { userId };
  if (opts?.serviceType && opts.serviceType !== "ALL") where.serviceType = opts.serviceType;
  if (opts?.status && opts.status !== "ALL") where.status = opts.status;
  if (opts?.from || opts?.to) {
    const range: Record<string, Date> = {};
    if (opts.from) range.gte = new Date(opts.from);
    if (opts.to) range.lte = new Date(`${opts.to}T23:59:59.999`);
    where.createdAt = range;
  }
  if (opts?.search) {
    where.OR = [
      { reference: { contains: opts.search } },
      { provider: { contains: opts.search } },
      { customerInfo: { contains: opts.search } },
      { description: { contains: opts.search } },
    ];
  }
  return Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
}

export async function getTransactionByReference(reference: string, userId?: string) {
  return prisma.transaction.findFirst({
    where: {
      reference,
      ...(userId ? { userId } : {}),
    },
    include: { user: { select: { fullName: true, email: true, phone: true } } },
  });
}

export async function getTransactionById(id: string, userId?: string) {
  return prisma.transaction.findFirst({
    where: { id, ...(userId ? { userId } : {}) },
    include: { user: { select: { fullName: true, email: true, phone: true } } },
  });
}

export function listAllTransactions(opts?: {
  search?: string;
  serviceType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts?.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (opts?.serviceType && opts.serviceType !== "ALL") where.serviceType = opts.serviceType;
  if (opts?.status && opts.status !== "ALL") where.status = opts.status;
  if (opts?.from || opts?.to) {
    const range: Record<string, Date> = {};
    if (opts.from) range.gte = new Date(opts.from);
    if (opts.to) range.lte = new Date(`${opts.to}T23:59:59.999`);
    where.createdAt = range;
  }
  if (opts?.search) {
    where.OR = [
      { reference: { contains: opts.search } },
      { provider: { contains: opts.search } },
      { customerInfo: { contains: opts.search } },
      { description: { contains: opts.search } },
      { user: { is: { fullName: { contains: opts.search } } } },
      { user: { is: { email: { contains: opts.search } } } },
    ];
  }
  return Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);
}