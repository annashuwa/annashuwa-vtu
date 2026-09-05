import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/auth";

export async function getOrCreateWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (wallet) return wallet;
  try {
    return await prisma.wallet.create({ data: { userId } });
  } catch {
    return await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  }
}

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new ApiError(404, "Wallet not found");
  return wallet;
}

/** Atomically credits a wallet and records a wallet transaction. */
export async function creditWallet(input: {
  userId: string;
  amount: number;
  type: string;
  reference: string;
  description?: string;
  transactionId?: string;
  metadata?: unknown;
}) {
  const wallet = await getWallet(input.userId);
  const newBalance = Number(wallet.balance) + input.amount;
  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: input.amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        balanceAfter: newBalance,
        status: "SUCCESSFUL",
        reference: input.reference,
        description: input.description,
        transactionId: input.transactionId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    }),
  ]);
  return newBalance;
}

/** Atomically debits a wallet (guards against insufficient funds) and records a wallet transaction. */
export async function debitWallet(input: {
  userId: string;
  amount: number;
  type: string;
  reference: string;
  description?: string;
  transactionId?: string;
  metadata?: unknown;
}) {
  const amount = Math.round(input.amount * 100) / 100;
  const wallet = await getWallet(input.userId);
  if (Number(wallet.balance) < amount) {
    throw new ApiError(400, "Insufficient wallet balance");
  }
  const newBalance = Math.round((Number(wallet.balance) - amount) * 100) / 100;
  await prisma.$transaction([
    prisma.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        type: input.type,
        amount: -amount,
        balanceAfter: newBalance,
        status: "SUCCESSFUL",
        reference: input.reference,
        description: input.description,
        transactionId: input.transactionId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      },
    }),
  ]);
  return newBalance;
}

export async function listWalletTransactions(userId: string, limit = 20) {
  return prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getWalletSummary(userId: string) {
  const [wallet, transactions, walletTxns] = await Promise.all([
    getWallet(userId),
    prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 1 }),
    listWalletTransactions(userId, 10),
  ]);
  return { wallet, latestTransactions: transactions, recentWalletTransactions: walletTxns };
}