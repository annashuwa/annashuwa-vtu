import { Wallet, WalletTransaction } from "../models";
import { ApiError } from "../lib/errors";
import { round2 } from "../lib/utils";
import type { ClientSession } from "mongoose";

export type WalletTxnType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "AIRTIME_PURCHASE"
  | "DATA_PURCHASE"
  | "ELECTRICITY_PAYMENT"
  | "CABLE_SUBSCRIPTION"
  | "EXAM_PIN_PURCHASE"
  | "REFUND"
  | "ADJUSTMENT"
  | "AIRTIME_TO_CASH";

type OptSession = { session?: ClientSession } | undefined;

export async function getWallet(userId: string) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0, availableBalance: 0, pendingBalance: 0, currency: "NGN" });
  } else {
    // Reconcile legacy wallets that predate the available/pending split.
    // Because the schema default of 0 masks "unset", compare against balance.
    const avail = Number(wallet.availableBalance ?? 0);
    const pending = Number(wallet.pendingBalance ?? 0);
    if (avail + pending !== Number(wallet.balance ?? 0)) {
      wallet.availableBalance = Number(wallet.balance ?? 0);
      wallet.pendingBalance = 0;
      await wallet.save();
    }
  }
  return wallet;
}

export async function getWalletSummary(userId: string) {
  const wallet = await getWallet(userId);
  const transactions = await WalletTransaction.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(10);
  return { wallet, transactions };
}

async function recordWalletTransaction(input: {
  wallet: { _id: string };
  userId: string;
  type: WalletTxnType | string;
  amount: number;
  balanceAfter: number;
  reference: string;
  description?: string;
  metadata?: unknown;
  transactionId?: string;
  session?: ClientSession;
}) {
  return WalletTransaction.create(
    [
      {
        walletId: input.wallet._id,
        userId: input.userId,
        type: input.type,
        amount: round2(input.amount),
        balanceAfter: input.balanceAfter,
        status: "SUCCESSFUL",
        reference: input.reference,
        description: input.description ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        transactionId: input.transactionId ?? null,
      },
    ],
    input.session ? { session: input.session } : {}
  ).then((a) => a[0]);
}

/**
 * Atomically debits the wallet. Uses a single atomic `$inc` guarded by
 * `availableBalance >= amount`, so concurrent debits serialize correctly at
 * the database level (no read-compute-write lost updates) and the wallet can
 * never be overdrawn. `amount` is debited from both `balance` and
 * `availableBalance`, preserving the invariant balance = available + pending.
 */
export async function debitWallet(input: {
  userId: string;
  amount: number;
  type: WalletTxnType | string;
  reference: string;
  description?: string;
  transactionId?: string;
  metadata?: unknown;
} & OptSession) {
  const wallet = await getWallet(input.userId);
  const amount = round2(input.amount);

  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id, availableBalance: { $gte: amount } },
    { $inc: { availableBalance: -amount, balance: -amount } },
    { new: true, session: input.session }
  );
  if (!updated) {
    throw new ApiError(400, "Insufficient wallet balance");
  }
  const newBalance = round2(Number(updated.balance ?? 0));

  const walletTxn = await recordWalletTransaction({
    wallet,
    userId: input.userId,
    type: input.type,
    amount: -amount,
    balanceAfter: newBalance,
    reference: input.reference,
    description: input.description,
    metadata: input.metadata,
    transactionId: input.transactionId,
    session: input.session,
  });

  return { wallet: updated, walletTxn };
}

/** Atomically credits the wallet via a single `$inc` (no lost updates). */
export async function creditWallet(input: {
  userId: string;
  amount: number;
  type: WalletTxnType | string;
  reference: string;
  description?: string;
  transactionId?: string;
  metadata?: unknown;
} & OptSession) {
  const wallet = await getWallet(input.userId);
  const amount = round2(input.amount);

  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id },
    { $inc: { availableBalance: amount, balance: amount } },
    { new: true, session: input.session }
  );
  const newBalance = round2(Number(updated?.balance ?? 0));

  const walletTxn = await recordWalletTransaction({
    wallet,
    userId: input.userId,
    type: input.type,
    amount,
    balanceAfter: newBalance,
    reference: input.reference,
    description: input.description,
    metadata: input.metadata,
    transactionId: input.transactionId,
    session: input.session,
  });

  return { wallet: updated, walletTxn };
}

/**
 * Moves funds from available to pending (e.g. funds reserved while a payment
 * or purchase is in flight). Total balance is unchanged.
 */
export async function holdFunds(input: {
  userId: string;
  amount: number;
  reference: string;
  description?: string;
  session?: ClientSession;
}) {
  const wallet = await getWallet(input.userId);
  const amount = round2(input.amount);
  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id, availableBalance: { $gte: amount } },
    { $inc: { availableBalance: -amount, pendingBalance: amount } },
    { new: true, session: input.session }
  );
  if (!updated) throw new ApiError(400, "Insufficient wallet balance");
  return updated;
}

/** Releases funds from pending back to available. */
export async function releaseFunds(input: {
  userId: string;
  amount: number;
  reference: string;
  session?: ClientSession;
}) {
  const wallet = await getWallet(input.userId);
  const amount = round2(input.amount);
  const updated = await Wallet.findOneAndUpdate(
    { _id: wallet._id, pendingBalance: { $gte: amount } },
    { $inc: { availableBalance: amount, pendingBalance: -amount } },
    { new: true, session: input.session }
  );
  if (!updated) throw new ApiError(400, "Insufficient pending balance");
  return updated;
}
