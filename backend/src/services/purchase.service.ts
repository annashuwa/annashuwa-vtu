/**
 * Orchestrates a paid service transaction:
 *   1. computes routing (provider + cost/profit)
 *   2. creates the Transaction and debits the wallet (atomically when the DB
 *      supports multi-document transactions, compensating-atomic otherwise)
 *   3. calls the routed VTU provider (outside the DB transaction)
 *   4. finalizes: SUCCESSFUL / REFUNDED / PROCESSING
 */
import { ApiError } from "../lib/errors";
import { getVtuProvider } from "./vtu";
import type { ProviderId, VtuProvider, VtuResponse } from "./vtu/types";
import { routeProviders, type RouteServiceType, type RouteInput, type RouteCandidate } from "./vtu/router";
import { getWallet, debitWallet, creditWallet } from "./wallet.service";
import { createTransaction, updateTransactionStatus, generateReference } from "./transaction.service";
import { createNotification } from "./notification.service";
import { Transaction, User } from "../models";
import { round2, sha256 } from "../lib/utils";
import { serializeTxn } from "../lib/serialize";
import { getSystemConfig } from "./config.service";
import { withDbTransaction } from "../lib/mongo-tx";
import { VTU_MAX_FAILOVER_ATTEMPTS } from "../config";

export type PurchaseInput = {
  userId: string;
  serviceType: string;
  provider: string;
  customerInfo?: string;
  amount: number;
  fee?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  paymentMethod?: string;
  preferredProvider?: string;
  execute: (vtu: VtuProvider, txnRef: string, idempotencyKey: string) => Promise<VtuResponse>;
};

export function mapServiceTypeToWalletType(serviceType: string): string {
  switch (serviceType) {
    case "AIRTIME":
      return "AIRTIME_PURCHASE";
    case "DATA":
      return "DATA_PURCHASE";
    case "ELECTRICITY":
      return "ELECTRICITY_PAYMENT";
    case "CABLE":
      return "CABLE_SUBSCRIPTION";
    case "EXAM_PIN":
      return "EXAM_PIN_PURCHASE";
    default:
      return serviceType;
  }
}

async function enforceKycAndLimits(input: PurchaseInput) {
  const user = await User.findById(input.userId).select("kycStatus").lean();
  if (!user) throw new ApiError(401, "You must be logged in to perform this action.");
  const kycThreshold = Number(await getSystemConfig("kycThreshold", 20000));
  const total = round2(input.amount + (input.fee ?? 0));
  if (kycThreshold > 0 && total > kycThreshold && user.kycStatus !== "VERIFIED") {
    throw new ApiError(
      403,
      `This transaction exceeds the ₦${kycThreshold.toLocaleString()} limit. Please complete KYC verification to continue.`,
      "KYC_REQUIRED"
    );
  }
}

function routeInputFor(input: PurchaseInput, planPrice: number): RouteInput {
  const routeInput: RouteInput = {
    serviceType: input.serviceType as RouteServiceType,
    amount: input.serviceType === "AIRTIME" ? input.amount : undefined,
    product: input.serviceType !== "AIRTIME" ? { price: planPrice, ...(input.metadata?.cost ? { costPrice: Number(input.metadata.cost) } : {}) } : undefined,
    preferredProvider: input.preferredProvider,
  };
  return routeInput;
}

export async function executePurchase(input: PurchaseInput) {
  const wallet = await getWallet(input.userId);
  const total = round2(input.amount + (input.fee ?? 0));
  if (Number(wallet.availableBalance ?? wallet.balance) < total) {
    throw new ApiError(400, "Insufficient wallet balance. Please fund your wallet.");
  }

  await enforceKycAndLimits(input);

  const route = routeProviders(routeInputFor(input, input.amount));
  const providerId = route.selected?.providerId ?? null;
  const costPrice = route.selected?.cost ?? (input.metadata?.cost ? Number(input.metadata.cost) : null);
  const profit = route.selected?.profit ?? (costPrice != null ? round2(input.amount - costPrice) : null);

  const reference = generateReference();
  const idempotencyKey = sha256(`${input.userId}:${input.serviceType}:${reference}`);

  let txnId: string | undefined;
  await withDbTransaction(async (session) => {
    const txn = await createTransaction({
      userId: input.userId,
      serviceType: input.serviceType,
      provider: input.provider,
      providerId: providerId ?? undefined,
      providerName: providerId ? route.selected?.name : undefined,
      customerInfo: input.customerInfo,
      amount: input.amount,
      fee: input.fee ?? 0,
      metadata: input.metadata,
      paymentMethod: input.paymentMethod ?? "WALLET",
      description: input.description,
      status: "PENDING",
      reference,
      idempotencyKey,
      costPrice,
      profit,
      session,
    });
    txnId = (txn as { _id: string })._id;

    await debitWallet({
      userId: input.userId,
      amount: total,
      type: mapServiceTypeToWalletType(input.serviceType),
      reference,
      description: input.description ?? input.provider,
      transactionId: txnId,
      metadata: { ...(input.metadata ?? {}), fee: input.fee ?? 0, providerId },
      session,
    });
  });
  const txnIdFinal = txnId!;

  // Provider failover: try the routed provider, then fallbacks, up to a cap.
  const ordered: Array<RouteCandidate | null> = [route.selected ?? null, ...route.fallbacks].filter(Boolean);
  const maxAttempts = 1 + Math.max(0, Math.min(4, VTU_MAX_FAILOVER_ATTEMPTS));
  const attempted: string[] = [];
  let result: VtuResponse | null = null;
  let usedProviderId: ProviderId | null = providerId;
  let usedProviderName: string | undefined = route.selected?.name;
  let lastFailure: string | null = null;

  for (const cand of ordered.slice(0, maxAttempts)) {
    if (!cand) continue;
    const attemptProvider = getVtuProvider(cand.providerId);
    attempted.push(cand.providerId);
    usedProviderId = cand.providerId;
    usedProviderName = cand.name;

    if (cand.providerId !== providerId) {
      await updateTransactionStatus(txnIdFinal, "PENDING", {
        providerId: cand.providerId,
        providerName: cand.name,
        adminNote: `Failover attempt to ${cand.name}`,
      });
    }

    try {
      const r = await input.execute(attemptProvider, reference, idempotencyKey);
      if (r.status === "FAILED") {
        lastFailure = r.message;
        continue;
      }
      result = r;
      break;
    } catch (err) {
      lastFailure = (err as Error).message;
      continue;
    }
  }

  if (!result) {
    await refundAndMarkFailed(txnIdFinal, input, reference, total, lastFailure ?? "Provider unavailable", attempted);
    throw new ApiError(
      502,
      `Service provider could not complete this transaction${attempted.length > 1 ? " after failover" : ""}. Your wallet has been refunded.`,
      "PROVIDER_ERROR"
    );
  }

  const apiResponse: unknown = {
    ...result,
    attempted,
  };
  if (result.status === "SUCCESSFUL") {
    await updateTransactionStatus(txnIdFinal, "SUCCESSFUL", {
      apiResponse,
      providerReference: extractProviderRef(result),
      providerId: usedProviderId ?? undefined,
      providerName: usedProviderName,
      costPrice: costPrice ?? undefined,
      profit: profit ?? undefined,
      adminNote: attempted.length > 1 ? `Succeeded via ${usedProviderName} after ${attempted.length - 1} failover(s)` : undefined,
    });
    await createNotification({
      userId: input.userId,
      title: "Transaction successful",
      message: `Your ${input.serviceType.replace(/_/g, " ").toLowerCase()} of ₦${input.amount} was successful. Reference: ${reference}`,
      type: "SUCCESS",
    });
  } else {
    await updateTransactionStatus(txnIdFinal, "PROCESSING", {
      apiResponse,
      providerReference: extractProviderRef(result),
      providerId: usedProviderId ?? undefined,
      providerName: usedProviderName,
    });
    await createNotification({
      userId: input.userId,
      title: "Transaction processing",
      message: `${result.message} Reference: ${reference}`,
      type: "INFO",
    });
  }

  const txnDoc = await Transaction.findById(txnIdFinal);
  const user = await User.findById(input.userId).select("fullName email phone").lean();
  return {
    transaction: {
      ...serializeTxn({
        id: txnIdFinal,
        reference: reference as string,
        serviceType: input.serviceType,
        provider: input.provider,
        providerId: usedProviderId ?? undefined,
        providerName: usedProviderName,
        providerReference: extractProviderRef(result),
        customerInfo: input.customerInfo ?? null,
        amount: input.amount,
        fee: input.fee ?? 0,
        status: txnDoc?.status ?? "PENDING",
        description: input.description ?? null,
        paymentMethod: input.paymentMethod ?? null,
        channel: "WEB",
        metadata: txnDoc?.metadata ?? null,
        apiResponse: txnDoc?.apiResponse ?? null,
        adminNote: txnDoc?.adminNote ?? null,
        createdAt: txnDoc?.createdAt ?? new Date(),
        updatedAt: txnDoc?.updatedAt ?? new Date(),
      }),
      userId: input.userId,
      user: user ? { fullName: user.fullName, email: user.email, phone: user.phone } : undefined,
    },
    providerResponse: { ...result, attempted },
  };
}

function extractProviderRef(result: VtuResponse): string | undefined {
  return (result.data as { providerReference?: string } | undefined)?.providerReference ?? undefined;
}

async function refundAndMarkFailed(
  txnId: string,
  input: PurchaseInput,
  reference: string,
  total: number,
  reason: string,
  attempted: string[] = []
) {
  await withDbTransaction(async (session) => {
    await creditWallet({
      userId: input.userId,
      amount: total,
      type: "REFUND",
      reference: `${reference}-RFND`,
      description: `Refund for failed transaction ${reference}`,
      transactionId: txnId,
      session,
    });
    await updateTransactionStatus(
      txnId,
      "REFUNDED",
      {
        description: reason,
        refundedAmount: total,
        adminNote:
          attempted.length > 0
            ? `Auto-refunded after ${attempted.length} provider attempt(s): ${attempted.join(", ")}`
            : "Auto-refunded on provider failure",
        session,
      }
    );
  });
  await createNotification({
    userId: input.userId,
    title: "Transaction refunded",
    message: `Your ${input.serviceType.replace(/_/g, " ").toLowerCase()} failed and ₦${total.toLocaleString()} was refunded to your wallet. Reference: ${reference}`,
    type: "INFO",
  });
}
