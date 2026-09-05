import type { User, Wallet } from "@prisma/client";
import type { UserProfile, Wallet as WalletView } from "@/types";

export function serializeWallet(wallet: Wallet | null | undefined): WalletView | undefined {
  if (!wallet) return undefined;
  return {
    id: wallet.id,
    balance: wallet.balance.toString(),
    currency: wallet.currency,
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export function serializeUser(
  user: Pick<User, "id" | "fullName" | "email" | "phone" | "role" | "status" | "avatar" | "emailVerified" | "createdAt"> & { wallet?: Wallet | null }
): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role as UserProfile["role"],
    status: user.status as UserProfile["status"],
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    wallet: serializeWallet(user.wallet),
  };
}