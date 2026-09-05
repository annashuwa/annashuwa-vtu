import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth";
import { getWalletSummary } from "@/services/wallet.service";
import { serializeWallet } from "@/lib/serialize";

export async function GET() {
  try {
    const user = await requireUser();
    const { wallet, recentWalletTransactions } = await getWalletSummary(user.id);
    return NextResponse.json({
      wallet: serializeWallet(wallet),
      transactions: recentWalletTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        balanceAfter: t.balanceAfter.toString(),
        status: t.status,
        reference: t.reference,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}