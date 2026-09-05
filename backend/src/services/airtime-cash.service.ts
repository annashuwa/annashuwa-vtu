import { AirtimeCashRequest, User } from "../models";
import { ApiError } from "../lib/errors";
import { generateReference, round2 } from "../lib/utils";
import { getAirtimeCashNetwork } from "./config.service";
import { creditWallet } from "./wallet.service";
import { createNotification } from "./notification.service";
import { createAuditLog } from "../lib/audit";
import { getAirtimeVerificationProvider } from "./airtime-verification";
import type { Request } from "express";

const PROCESSABLE = new Set(["PENDING", "VERIFYING"]);

export async function createAirtimeToCashRequest(input: {
  userId: string;
  network: string;
  phone: string;
  amount: number;
  req?: Request;
}) {
  const cfg = await getAirtimeCashNetwork(input.network);
  if (!cfg.receivingNumber) {
    throw new ApiError(400, "Airtime-to-cash is not configured for this network yet", "SERVICE_UNAVAILABLE");
  }
  if (input.amount < cfg.minAmount) {
    throw new ApiError(400, `Minimum airtime-to-cash amount is ₦${cfg.minAmount}`, "LIMIT_EXCEEDED");
  }
  if (input.amount > cfg.maxAmount) {
    throw new ApiError(400, `Maximum airtime-to-cash amount is ₦${cfg.maxAmount}`, "LIMIT_EXCEEDED");
  }

  const grossCashAmount = round2((input.amount * cfg.conversionRate) / 100);
  const fee = round2(cfg.fee);
  const netAmount = round2(grossCashAmount - fee);
  const reference = generateReference("A2C");

  const request = await AirtimeCashRequest.create({
    userId: input.userId,
    network: input.network,
    phone: input.phone,
    receivingPhone: cfg.receivingNumber,
    amount: input.amount,
    conversionRate: cfg.conversionRate,
    grossCashAmount,
    fee,
    netAmount,
    status: "PENDING",
    reference,
  });

  await createNotification({
    userId: input.userId,
    title: "Airtime-to-cash request received",
    message: `Your request to convert ₦${input.amount} of ${input.network} airtime is pending verification.`,
    type: "INFO",
  });
  await createAuditLog({
    userId: input.userId,
    action: "A2C_REQUEST",
    entityType: "AirtimeCashRequest",
    entityId: request._id,
    details: { reference, network: input.network, amount: input.amount },
    req: input.req,
  });

  return {
    reference,
    status: "PENDING",
    network: input.network,
    amount: input.amount,
    conversionRate: cfg.conversionRate,
    grossCashAmount,
    fee,
    netAmount,
    receivingPhone: cfg.receivingNumber,
    message: "Your airtime transfer is pending verification.",
  };
}

export async function listUserAirtimeCashRequests(userId: string, limit = 50) {
  const requests = await AirtimeCashRequest.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit);
  return { requests };
}

export async function getUserAirtimeCashRequest(userId: string, id: string) {
  const request = await AirtimeCashRequest.findOne({ _id: id, userId });
  return request;
}

export async function listAllAirtimeCashRequests(opts: { status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts.pageSize ?? 20));
  const where: Record<string, unknown> = {};
  if (opts.status && opts.status !== "ALL") where.status = opts.status;
  const [requests, total] = await Promise.all([
    AirtimeCashRequest.find(where).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    AirtimeCashRequest.countDocuments(where),
  ]);
  return { requests, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function assertProcessable(request: { _id: string; status: string }): void {
  if (!PROCESSABLE.has(request.status)) {
    throw new ApiError(400, "This request has already been processed", "ALREADY_PROCESSED");
  }
}

/**
 * Atomically transitions a request out of a processable state only if it is
 * still processable, preventing duplicate approvals/resolutions.
 */
async function tryTransition(requestId: string, from: Set<string>, to: string): Promise<boolean> {
  const res = await AirtimeCashRequest.updateOne(
    { _id: requestId, status: { $in: [...from] } },
    { $set: { status: to } }
  );
  return (res.modifiedCount ?? 0) > 0;
}

export async function beginAirtimeCashVerification(id: string, adminUserId: string, req?: Request) {
  const request = await AirtimeCashRequest.findById(id);
  if (!request) return null;
  assertProcessable(request);
  const changed = await AirtimeCashRequest.updateOne(
    { _id: id, status: "PENDING" },
    { $set: { status: "VERIFYING" } }
  );
  if ((changed.modifiedCount ?? 0) === 0) {
    throw new ApiError(400, "This request has already been processed", "ALREADY_PROCESSED");
  }
  await createAuditLog({
    userId: adminUserId,
    action: "A2C_BEGIN_VERIFY",
    entityType: "AirtimeCashRequest",
    entityId: id,
    req,
  });
  return { status: "VERIFYING", reference: request.reference };
}

export async function approveAirtimeCashRequest(
  id: string,
  adminUserId: string,
  note?: string,
  req?: Request
) {
  const request = await AirtimeCashRequest.findById(id);
  if (!request) return null;
  assertProcessable(request);

  const provider = getAirtimeVerificationProvider();
  const verification = await provider.verifyTransfer(
    {
      reference: request.reference,
      network: request.network,
      senderPhone: request.phone,
      receivingPhone: request.receivingPhone,
      amount: request.amount,
    },
    // Manual provider: treat the admin's explicit approve action as the
    // verification until an automatic provider is wired up.
    { allowManualApproval: true }
  );

  let verificationReason: string | null = null;
  if (!verification.verified) {
    verificationReason = verification.reason ?? null;
    throw new ApiError(400, verification.reason ?? "Airtime transfer could not be verified", "VERIFICATION_FAILED");
  }

  // Idempotency: atomically transition only if still processable. This
  // prevents a double approval from crediting the wallet twice.
  const changed = await tryTransition(request._id, PROCESSABLE, "APPROVED");
  if (!changed) {
    throw new ApiError(400, "This request has already been processed", "ALREADY_PROCESSED");
  }

  await creditWallet({
    userId: request.userId,
    amount: request.netAmount,
    type: "AIRTIME_TO_CASH",
    reference: request.reference,
    description: `Airtime-to-cash payout for ${request.network} (${request.phone})`,
    metadata: {
      requestId: id,
      gross: request.grossCashAmount,
      fee: request.fee,
      conversionRate: request.conversionRate,
    },
  });

  await AirtimeCashRequest.findByIdAndUpdate(id, {
    $set: {
      status: "APPROVED",
      verificationNotes: note ?? verificationReason,
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      processedAt: new Date(),
    },
  });

  await createNotification({
    userId: request.userId,
    title: "Airtime-to-cash approved",
    message: `Your wallet has been credited with ₦${request.netAmount} for airtime-to-cash (${request.network}).`,
    type: "SUCCESS",
  });
  await createAuditLog({
    userId: adminUserId,
    action: "A2C_APPROVE",
    entityType: "AirtimeCashRequest",
    entityId: id,
    details: { note },
    req,
  });

  return {
    status: "APPROVED",
    reference: request.reference,
    netAmount: request.netAmount,
    verifiedBy: adminUserId,
  };
}

export async function rejectAirtimeCashRequest(
  id: string,
  adminUserId: string,
  note?: string,
  req?: Request
) {
  const request = await AirtimeCashRequest.findById(id);
  if (!request) return null;
  assertProcessable(request);

  const changed = await tryTransition(request._id, PROCESSABLE, "REJECTED");
  if (!changed) {
    throw new ApiError(400, "This request has already been processed", "ALREADY_PROCESSED");
  }

  await AirtimeCashRequest.findByIdAndUpdate(id, {
    $set: {
      status: "REJECTED",
      verificationNotes: note ?? null,
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      processedAt: new Date(),
    },
  });

  await createNotification({
    userId: request.userId,
    title: "Airtime-to-cash rejected",
    message: note ?? "Your airtime-to-cash request was rejected. Contact support for details.",
    type: "ERROR",
  });
  await createAuditLog({
    userId: adminUserId,
    action: "A2C_REJECT",
    entityType: "AirtimeCashRequest",
    entityId: id,
    details: { note },
    req,
  });

  return {
    status: "REJECTED",
    reference: request.reference,
  };
}

export async function cancelAirtimeCashRequest(id: string, userId: string, req?: Request) {
  const request = await AirtimeCashRequest.findOne({ _id: id, userId });
  if (!request) return null;
  if (request.status !== "PENDING") {
    throw new ApiError(400, "Only pending requests can be cancelled", "INVALID_STATE");
  }
  await AirtimeCashRequest.findByIdAndUpdate(id, {
    $set: { status: "CANCELLED", processedAt: new Date() },
  });
  await createAuditLog({ userId, action: "A2C_CANCEL", entityType: "AirtimeCashRequest", entityId: id, req });
  return { status: "CANCELLED", reference: request.reference };
}

/**
 * Legacy single decision helper kept for the existing PATCH endpoint.
 */
export async function decideAirtimeCashRequest(
  id: string,
  decision: "APPROVED" | "REJECTED",
  adminUserId: string,
  note?: string,
  req?: Request
) {
  if (decision === "APPROVED") {
    return approveAirtimeCashRequest(id, adminUserId, note, req);
  }
  return rejectAirtimeCashRequest(id, adminUserId, note, req);
}

/** Resolves the admin name for audit display (best-effort). */
export async function getAdminName(adminUserId: string): Promise<string> {
  const user = await User.findById(adminUserId).lean();
  return user?.fullName ?? "Administrator";
}
