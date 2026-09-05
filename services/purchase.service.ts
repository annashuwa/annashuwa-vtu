/**
 * Orchestrates a paid service transaction:
 *   1. creates a Transaction (PENDING)
 *   2. debits the wallet
 *   3. calls the VTU provider
 *   4. marks SUCCESSFUL / PROCESSING / FAILED (refunding on failure)
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/auth";
import { getVtuProvider } from "@/services/vtu";
import type { VtuProvider, VtuResponse } from "@/services/vtu/types";
import { getWallet, debitWallet, creditWallet } from "@/services/wallet.service";
import { createTransaction, updateTransactionStatus } from "@/services/transaction.service";
import { createNotification } from "@/services/notification.service";
import { generateReference } from "@/lib/utils";
import type { ServiceType } from "@/types";

export type PurchaseInput = {
  userId: string;
  serviceType: ServiceType;
  provider: string;
  customerInfo?: string;
  amount: number;
  fee?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  paymentMethod?: string;
  execute: (vtu: VtuProvider, txnRef: string) => Promise<VtuResponse>;
};

export async function executePurchase(input: PurchaseInput) {
  const wallet = await getWallet(input.userId);
  const total = input.amount + (input.fee ?? 0);
  if (Number(wallet.balance) < total) {
    throw new ApiError(400, "Insufficient wallet balance. Please fund your wallet.");
  }

  const txn = await createTransaction({
    userId: input.userId,
    serviceType: input.serviceType,
    provider: input.provider,
    customerInfo: input.customerInfo,
    amount: input.amount,
    fee: input.fee ?? 0,
    metadata: input.metadata,
    paymentMethod: input.paymentMethod ?? "WALLET",
    description: input.description,
    status: "PENDING",
  });

  await debitWallet({
    userId: input.userId,
    amount: total,
    type: mapServiceTypeToWalletType(input.serviceType),
    reference: txn.reference,
    description: input.description ?? input.provider,
    transactionId: txn.id,
    metadata: { ...(input.metadata ?? {}), fee: input.fee ?? 0 },
  });

  let result: VtuResponse;
  try {
    result = await input.execute(getVtuProvider(), txn.reference);
  } catch (err) {
    await refund(txn.id, txn.userId, txn.reference, input.amount, input.fee ?? 0);
    await updateTransactionStatus(txn.id, "FAILED", { description: (err as Error).message });
    throw new ApiError(502, "Service provider could not process this transaction. Your wallet has been refunded.", "PROVIDER_ERROR");
  }

  if (result.status === "SUCCESSFUL") {
    await updateTransactionStatus(txn.id, "SUCCESSFUL", { apiResponse: result });
    await createNotification({
      userId: input.userId,
      title: "Transaction successful",
      message: `Your ${input.serviceType.replace(/_/g, " ").toLowerCase()} of ₦${input.amount} was successful. Reference: ${txn.reference}`,
      type: "SUCCESS",
    });
  } else if (result.status === "FAILED") {
    await refund(txn.id, txn.userId, txn.reference, input.amount, input.fee ?? 0);
    await updateTransactionStatus(txn.id, "FAILED", { apiResponse: result });
    await createNotification({
      userId: input.userId,
      title: "Transaction failed",
      message: result.message,
      type: "ERROR",
    });
  } else {
    await updateTransactionStatus(txn.id, "PROCESSING", { apiResponse: result });
    await createNotification({
      userId: input.userId,
      title: "Transaction processing",
      message: `${result.message} Reference: ${txn.reference}`,
      type: "INFO",
    });
  }

  const finalTxn = await prisma.transaction.findUniqueOrThrow({
    where: { id: txn.id },
    include: { user: { select: { fullName: true, email: true, phone: true } } },
  });

  return { transaction: finalTxn, providerResponse: result };
}

async function refund(txnId: string, userId: string, reference: string, amount: number, fee: number) {
  const refunded = amount + fee;
  await creditWallet({
    userId,
    amount: refunded,
    type: "REFUND",
    reference: `${reference}-RFND`,
    description: `Refund for failed transaction ${reference}`,
    transactionId: txnId,
  });
}

function mapServiceTypeToWalletType(serviceType: ServiceType): string {
  switch (serviceType) {
    case "AIRTIME": return "AIRTIME_PURCHASE";
    case "DATA": return "DATA_PURCHASE";
    case "ELECTRICITY": return "ELECTRICITY_PAYMENT";
    case "CABLE": return "CABLE_SUBSCRIPTION";
    case "EXAM_PIN": return "EXAM_PIN_PURCHASE";
    default: return serviceType;
  }
}

export { generateReference };