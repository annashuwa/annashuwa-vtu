import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/auth";
import { getPaymentProvider, getTestProvider } from "@/services/payment";
import { creditWallet } from "@/services/wallet.service";
import { updateTransactionStatus } from "@/services/transaction.service";
import { createNotification } from "@/services/notification.service";
import { createAuditLog } from "@/lib/audit";
import type { Payment } from "@prisma/client";

export async function finalizeWalletFunding(reference: string, opts?: { simulate?: "SUCCESSFUL" | "FAILED" }) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) throw new ApiError(404, "Payment reference not found", "PAYMENT_NOT_FOUND");

  // Idempotency guard
  if (payment.status === "SUCCESSFUL" || payment.status === "FAILED") {
    const balance = payment.status === "SUCCESSFUL" ? await getBalanceAfter(payment) : undefined;
    return { payment, alreadyFinalized: true, balance };
  }

  if (opts?.simulate) {
    await getTestProvider().resolve(reference, opts.simulate);
  }

  const provider = getPaymentProvider(payment.gateway);
  const result = await provider.verify(reference);

  if (result.status === "SUCCESSFUL") {
    const balance = await creditWallet({
      userId: payment.userId,
      amount: Number(result.amount || payment.amount),
      type: "DEPOSIT",
      reference,
      description: "Wallet funding via " + payment.gateway,
      transactionId: payment.transactionId ?? undefined,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESSFUL", verifyData: JSON.stringify(result) },
    });
    if (payment.transactionId) {
      await updateTransactionStatus(payment.transactionId, "SUCCESSFUL", {
        apiResponse: result,
        description: `Wallet funding of ₦${Number(payment.amount)} received via ${payment.gateway}`,
      });
    }
    await createNotification({
      userId: payment.userId,
      title: "Wallet funded",
      message: `Your wallet has been credited with ₦${Number(payment.amount)}.`,
      type: "SUCCESS",
    });
    await createAuditLog({
      userId: payment.userId,
      action: "WALLET_FUND_SUCCESS",
      entityType: "Payment",
      entityId: payment.id,
      details: { amount: payment.amount, gateway: payment.gateway, reference },
    });
    return { payment: { ...payment, status: "SUCCESSFUL" }, balance };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", verifyData: JSON.stringify(result) },
  });
  if (payment.transactionId) {
    await updateTransactionStatus(payment.transactionId, "FAILED", { apiResponse: result });
  }
  await createNotification({
    userId: payment.userId,
    title: "Payment failed",
    message: `Your wallet funding of ₦${Number(payment.amount)} was not completed.`,
    type: "ERROR",
  });
  return { payment: { ...payment, status: "FAILED" }, result };
}

async function getBalanceAfter(payment: Payment): Promise<number> {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: payment.userId } });
  return Number(wallet.balance);
}