import { Transaction, User } from "../models";
import type { TransactionStatus } from "../models/transaction";
import { generateReference, escRegex, round2 } from "../lib/utils";
import type { ClientSession } from "mongoose";

export type CreateTransactionInput = {
  userId: string;
  serviceType: string;
  provider: string;
  providerId?: string;
  providerName?: string;
  customerInfo?: string;
  amount: number;
  fee?: number;
  status?: TransactionStatus;
  description?: string;
  metadata?: unknown;
  paymentMethod?: string;
  reference?: string;
  channel?: string;
  idempotencyKey?: string;
  costPrice?: number | null;
  profit?: number | null;
  session?: ClientSession;
};

const ALLOWED_NEXT: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: ["PROCESSING", "SUCCESSFUL", "FAILED", "REFUNDED", "REVERSED"],
  PROCESSING: ["SUCCESSFUL", "FAILED", "REFUNDED", "REVERSED", "PARTIAL_REFUND"],
  SUCCESSFUL: ["REFUNDED", "REVERSED", "PARTIAL_REFUND"],
  FAILED: ["REFUNDED", "REVERSED"],
  REFUNDED: [],
  REVERSED: [],
  PARTIAL_REFUND: ["REFUNDED"],
};

export class InvalidStatusTransitionError extends Error {
  statusCode = 409;
  code = "INVALID_TRANSITION";
  from: string;
  to: string;
  constructor(from: string, to: string) {
    super(`Invalid status transition from ${from} to ${to}`);
    this.name = "InvalidStatusTransitionError";
    this.from = from;
    this.to = to;
  }
}

export async function createTransaction(input: CreateTransactionInput) {
  if (input.session) {
    return Transaction.create(
      [
        {
          reference: input.reference ?? generateReference(),
          userId: input.userId,
          serviceType: input.serviceType,
          provider: input.provider,
          providerId: input.providerId ?? null,
          providerName: input.providerName ?? null,
          customerInfo: input.customerInfo ?? null,
          amount: input.amount,
          fee: input.fee ?? 0,
          costPrice: input.costPrice ?? null,
          profit: input.profit ?? null,
          status: input.status ?? "PENDING",
          description: input.description ?? null,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          paymentMethod: input.paymentMethod ?? null,
          channel: input.channel ?? "WEB",
          idempotencyKey: input.idempotencyKey ?? null,
        },
      ],
      { session: input.session }
    ).then((a) => a[0]);
  }
  return Transaction.create({
    reference: input.reference ?? generateReference(),
    userId: input.userId,
    serviceType: input.serviceType,
    provider: input.provider,
    providerId: input.providerId ?? null,
    providerName: input.providerName ?? null,
    customerInfo: input.customerInfo ?? null,
    amount: input.amount,
    fee: input.fee ?? 0,
    costPrice: input.costPrice ?? null,
    profit: input.profit ?? null,
    status: input.status ?? "PENDING",
    description: input.description ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    paymentMethod: input.paymentMethod ?? null,
    channel: input.channel ?? "WEB",
    idempotencyKey: input.idempotencyKey ?? null,
  });
}

export type UpdateStatusOpts = {
  apiResponse?: unknown;
  description?: string;
  refundedAmount?: number;
  providerReference?: string;
  providerId?: string;
  providerName?: string;
  costPrice?: number;
  profit?: number;
  adminNote?: string;
  session?: ClientSession;
};

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus,
  opts?: UpdateStatusOpts
) {
  const current = await Transaction.findById(id).select("status").lean();
  if (!current) throw new Error(`Transaction ${id} not found`);
  const allowed = ALLOWED_NEXT[current.status as TransactionStatus] ?? [];
  if (status !== current.status && !allowed.includes(status)) {
    throw new InvalidStatusTransitionError(current.status, status);
  }

  const $set: Record<string, unknown> = { status };
  if (opts?.apiResponse !== undefined) {
    $set.apiResponse =
      typeof opts.apiResponse === "string" ? opts.apiResponse : JSON.stringify(opts.apiResponse);
  }
  if (opts?.description !== undefined) $set.description = opts.description;
  if (opts?.refundedAmount !== undefined) $set.refundedAmount = round2(opts.refundedAmount);
  if (opts?.providerReference !== undefined) $set.providerReference = opts.providerReference;
  if (opts?.providerId !== undefined) $set.providerId = opts.providerId;
  if (opts?.providerName !== undefined) $set.providerName = opts.providerName;
  if (opts?.costPrice !== undefined) $set.costPrice = opts.costPrice;
  if (opts?.profit !== undefined) $set.profit = opts.profit;
  if (opts?.adminNote !== undefined) $set.adminNote = opts.adminNote;

  return Transaction.findByIdAndUpdate(id, { $set }, { new: true, session: opts?.session });
}

async function userSelect(userId: string) {
  const u = await User.findById(userId).select("fullName email phone").lean();
  return u ? { fullName: u.fullName, email: u.email, phone: u.phone } : null;
}

export function txnFilter(opts: {
  userId?: string;
  search?: string;
  serviceType?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const where: Record<string, unknown> = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.serviceType && opts.serviceType !== "ALL") where.serviceType = opts.serviceType;
  if (opts.status && opts.status !== "ALL") where.status = opts.status;
  if (opts.from || opts.to) {
    const range: Record<string, Date> = {};
    if (opts.from) range.$gte = new Date(opts.from);
    if (opts.to) range.$lte = new Date(`${opts.to}T23:59:59.999`);
    where.createdAt = range;
  }
  if (opts.search) {
    const pattern = new RegExp(escRegex(opts.search), "i");
    where.$or = [
      { reference: pattern },
      { provider: pattern },
      { customerInfo: pattern },
      { description: pattern },
    ];
  }
  return where;
}

export async function listUserTransactions(
  userId: string,
  opts: {
    search?: string;
    serviceType?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
  }
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, opts.pageSize ?? 10));
  const where = txnFilter({ ...opts, userId });
  const [items, total] = await Promise.all([
    Transaction.find(where).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    Transaction.countDocuments(where),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAllTransactions(opts: {
  search?: string;
  serviceType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts.pageSize ?? 20));
  const base = txnFilter(opts);
  if (opts.search) {
    const pattern = new RegExp(escRegex(opts.search), "i");
    const ids = await User.find({
      $or: [{ fullName: pattern }, { email: pattern }],
    })
      .select("_id")
      .limit(500);
    base.$or = [
      { reference: pattern },
      { provider: pattern },
      { customerInfo: pattern },
      { description: pattern },
      { userId: { $in: ids.map((x) => x._id) } },
    ];
  }
  const [items, total] = await Promise.all([
    Transaction.find(base).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    Transaction.countDocuments(base),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getTransactionByReference(reference: string, userId?: string) {
  const txn = await Transaction.findOne({ reference, ...(userId ? { userId } : {}) });
  if (!txn) return null;
  const user = await userSelect(txn.userId);
  return { txn, user };
}

export async function getTransactionById(id: string, userId?: string) {
  const txn = await Transaction.findOne({ _id: id, ...(userId ? { userId } : {}) });
  if (!txn) return null;
  const user = await userSelect(txn.userId);
  return { txn, user };
}

export { generateReference };
