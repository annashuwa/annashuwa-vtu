import { Payment, Transaction } from "../models";
import { ApiError } from "../lib/errors";
import { generateReference } from "../lib/utils";
import { getPaymentProvider, getTestProvider } from "./payment";
import { findEnabledGateway } from "./payment/types";
import { PAYMENT_MODE } from "../config";
import { creditWallet, getWallet } from "./wallet.service";
import { createNotification } from "./notification.service";
import { createTransaction } from "./transaction.service";
import { createAuditLog } from "../lib/audit";
import type { Request } from "express";

export async function initializeFunding(input: {
  userId: string;
  email: string;
  amount: number;
  gateway: string;
  fullName: string;
  req?: Request;
}) {
  const reference = generateReference("ANS-FUND");
  // Resolve the requested gateway against what is actually enabled. The TEST
  // simulator is never usable in live mode — otherwise anyone could fund
  // their wallet without paying by self-approving a TEST payment.
  const gateway = findEnabledGateway(input.gateway || "TEST");
  if (PAYMENT_MODE === "live" && gateway === "TEST") {
    throw new ApiError(400, "Test payments are disabled in live mode", "VALIDATION_ERROR");
  }

  const txn = await createTransaction({
    userId: input.userId,
    serviceType: "WALLET_FUNDING",
    provider: gateway,
    customerInfo: input.email,
    amount: input.amount,
    status: "PENDING",
    description: `Wallet top-up of ₦${input.amount}`,
    paymentMethod: gateway,
    metadata: { gateway },
  });

  const payment = await Payment.create({
    reference,
    userId: input.userId,
    transactionId: txn.id,
    amount: input.amount,
    gateway,
    status: "PENDING",
    metadata: JSON.stringify({ email: input.email, fullName: input.fullName }),
  });

  const provider = getPaymentProvider(gateway);
  const init = await provider.initialize({
    userId: input.userId,
    email: input.email,
    amount: input.amount,
    reference,
    metadata: { fullName: input.fullName, transactionId: txn.id },
  });
  await Payment.findByIdAndUpdate(payment.id, { $set: { initData: JSON.stringify(init) } });

  await createNotification({
    userId: input.userId,
    title: "Payment initiated",
    message: `A wallet funding of ₦${input.amount} has been initiated (${gateway}).`,
    type: "INFO",
  });

  await createAuditLog({
    userId: input.userId,
    action: "WALLET_FUND_INIT",
    entityType: "Payment",
    entityId: payment.id,
    details: { reference, gateway, amount: input.amount },
    req: input.req,
  });

  return { reference, gateway, authUrl: init.authUrl, message: init.message };
}

export async function finalizeWalletFunding(
  reference: string,
  opts: { simulate?: "success" | "decline"; userId: string; role: string; req?: Request }
) {
  const payment = await Payment.findOne({ reference });
  if (!payment) {
    throw new ApiError(404, "Payment reference not found", "PAYMENT_NOT_FOUND");
  }

  const isOwner = payment.userId === opts.userId || opts.role === "ADMIN";
  if (!isOwner) {
    throw new ApiError(403, "Not authorized", "FORBIDDEN");
  }

  const wallet = await getWallet(payment.userId);

  if (payment.status === "SUCCESSFUL" || payment.status === "FAILED") {
    return { payment, alreadyFinalized: true, balance: Number(wallet.balance) };
  }

  // The client-driven approve/decline simulation only exists for the TEST
  // simulator in test mode. It is ignored for real gateways and in live mode.
  if (opts.simulate && payment.gateway === "TEST" && PAYMENT_MODE === "test") {
    await getTestProvider().resolve(reference, opts.simulate === "success" ? "SUCCESSFUL" : "FAILED");
  }

  const provider = getPaymentProvider(payment.gateway);
  const verify = await provider.verify(reference);

  if (verify.status === "SUCCESSFUL") {
    const credited = Number(verify.amount) || Number(payment.amount);
    // Never silently credit a different amount than what was initialized.
    // Credit what the provider confirms was actually paid, but flag any
    // mismatch for admin review.
    const amountMismatch = credited !== Number(payment.amount);
    await creditWallet({
      userId: payment.userId,
      amount: credited,
      type: "DEPOSIT",
      reference,
      description: `Wallet funding via ${payment.gateway}`,
      transactionId: payment.transactionId ?? undefined,
    });
    await Payment.findByIdAndUpdate(payment.id, {
      $set: { status: "SUCCESSFUL", verifyData: JSON.stringify(verify) },
    });
    await Transaction.findByIdAndUpdate(payment.transactionId, {
      $set: {
        status: "SUCCESSFUL",
        description: `Wallet funding of ₦${credited} received via ${payment.gateway}`,
        ...(amountMismatch
          ? { adminNote: `Amount mismatch: initialized ₦${payment.amount}, provider confirmed ₦${credited}.` }
          : {}),
      },
    });
    await createNotification({
      userId: payment.userId,
      title: "Wallet funded",
      message: `Your wallet has been credited with ₦${credited}.`,
      type: "SUCCESS",
    });
    await createAuditLog({
      userId: payment.userId,
      action: "WALLET_FUND_SUCCESS",
      entityType: "Payment",
      entityId: payment.id,
      details: { reference, amount: credited, gateway: payment.gateway, ...(amountMismatch ? { amountMismatch: true, expectedAmount: Number(payment.amount) } : {}) },
      req: opts.req,
    });
  } else {
    await Payment.findByIdAndUpdate(payment.id, {
      $set: { status: "FAILED", verifyData: JSON.stringify(verify) },
    });
    await Transaction.findByIdAndUpdate(payment.transactionId, {
      $set: {
        status: "FAILED",
        description: `Wallet funding of ₦${payment.amount} was not completed.`,
      },
    });
    await createNotification({
      userId: payment.userId,
      title: "Payment failed",
      message: `Your wallet funding of ₦${payment.amount} was not completed.`,
      type: "ERROR",
    });
  }

  const fresh = await getWallet(payment.userId);
  return {
    payment: await Payment.findById(payment.id),
    alreadyFinalized: false,
    status: verify.status,
    balance: Number(fresh.balance),
    reference,
  };
}