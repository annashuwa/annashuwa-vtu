import { moneyToString } from "./utils";

export interface WalletLike {
  id: string;
  balance: number | string | null | undefined;
  availableBalance?: number | string | null;
  pendingBalance?: number | string | null;
  currency: string;
  updatedAt: Date | string;
}

export interface UserLike {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  avatar: string | null | undefined;
  emailVerified: boolean;
  createdAt: Date | string;
}

export function serializeWallet(wallet: WalletLike) {
  const out: Record<string, unknown> = {
    id: wallet.id,
    balance: moneyToString(wallet.balance as number | null | undefined) ?? "0",
    currency: wallet.currency,
    updatedAt: new Date(wallet.updatedAt).toISOString(),
  };
  if (wallet.availableBalance != null) {
    out.availableBalance = moneyToString(wallet.availableBalance as number) ?? "0";
    out.pendingBalance = moneyToString(wallet.pendingBalance as number) ?? "0";
  }
  return out;
}

export function serializeUser(
  user: UserLike,
  wallet?: WalletLike | null
) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    avatar: user.avatar ?? null,
    emailVerified: user.emailVerified,
    createdAt: new Date(user.createdAt).toISOString(),
    ...(wallet ? { wallet: serializeWallet(wallet) } : {}),
  };
}

export function serializeTxn(txn: {
  id: string;
  reference: string;
  serviceType: string;
  provider: string;
  providerId?: string | null;
  providerName?: string | null;
  providerReference?: string | null;
  customerInfo?: string | null;
  amount: number | string;
  fee: number | string;
  costPrice?: number | string | null;
  profit?: number | string | null;
  refundedAmount?: number | string | null;
  status: string;
  description?: string | null;
  paymentMethod?: string | null;
  channel?: string | null;
  metadata?: string | null;
  apiResponse?: string | null;
  adminNote?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
}) {
  return {
    id: txn.id,
    reference: txn.reference,
    serviceType: txn.serviceType,
    provider: txn.provider,
    providerId: txn.providerId ?? null,
    providerName: txn.providerName ?? null,
    providerReference: txn.providerReference ?? null,
    customerInfo: txn.customerInfo ?? null,
    amount: moneyToString(txn.amount as number) ?? "0",
    fee: moneyToString(txn.fee as number) ?? "0",
    status: txn.status,
    description: txn.description ?? null,
    metadata: txn.metadata ?? null,
    paymentMethod: txn.paymentMethod ?? null,
    channel: txn.channel ?? null,
    apiResponse: txn.apiResponse ?? null,
    adminNote: txn.adminNote ?? null,
    ...(txn.costPrice != null ? { costPrice: moneyToString(txn.costPrice as number) ?? null } : {}),
    ...(txn.profit != null ? { profit: moneyToString(txn.profit as number) ?? null } : {}),
    ...(txn.refundedAmount != null ? { refundedAmount: moneyToString(txn.refundedAmount as number) ?? null } : {}),
    createdAt: new Date(txn.createdAt).toISOString(),
    ...(txn.updatedAt ? { updatedAt: new Date(txn.updatedAt).toISOString() } : {}),
  };
}

/** Public "card" shape used in the user transactions list (A22). */
export function serializeTxnCard(txn: {
  id: string;
  reference: string;
  serviceType: string;
  provider: string;
  customerInfo?: string | null;
  amount: number | string;
  fee: number | string;
  status: string;
  description?: string | null;
  paymentMethod?: string | null;
  createdAt: Date | string;
}) {
  return {
    id: txn.id,
    reference: txn.reference,
    serviceType: txn.serviceType,
    provider: txn.provider,
    customerInfo: txn.customerInfo ?? null,
    amount: moneyToString(txn.amount as number) ?? "0",
    fee: moneyToString(txn.fee as number) ?? "0",
    status: txn.status,
    description: txn.description ?? null,
    paymentMethod: txn.paymentMethod ?? null,
    createdAt: new Date(txn.createdAt).toISOString(),
  };
}

export function serializeWalletTxn(txn: {
  id: string;
  type: string;
  amount: number | string;
  balanceAfter: number | string;
  status: string;
  reference: string;
  description?: string | null;
  createdAt: Date | string;
}) {
  return {
    id: txn.id,
    type: txn.type,
    amount: moneyToString(txn.amount as number) ?? "0",
    balanceAfter: moneyToString(txn.balanceAfter as number) ?? "0",
    status: txn.status,
    reference: txn.reference,
    description: txn.description ?? null,
    createdAt: new Date(txn.createdAt).toISOString(),
  };
}

export interface AirtimeCashLike {
  id: string;
  reference: string;
  network: string;
  phone: string;
  receivingPhone?: string | null;
  amount: number | string;
  conversionRate?: number | string | null;
  grossCashAmount?: number | string | null;
  fee?: number | string | null;
  netAmount?: number | string | null;
  status: string;
  verificationNotes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
}

export function serializeAirtimeCash(
  r: AirtimeCashLike,
  extra?: { userName?: string | null; userEmail?: string | null; verifiedByName?: string | null }
) {
  return {
    id: r.id,
    reference: r.reference,
    network: r.network,
    phone: r.phone,
    receivingPhone: r.receivingPhone ?? null,
    amount: moneyToString(r.amount as number) ?? "0",
    conversionRate: r.conversionRate != null ? String(Number(r.conversionRate)) : null,
    grossCashAmount: moneyToString(r.grossCashAmount as number) ?? "0",
    fee: moneyToString(r.fee as number) ?? "0",
    netAmount: moneyToString(r.netAmount as number) ?? "0",
    status: r.status,
    verificationNotes: r.verificationNotes ?? null,
    verifiedBy: r.verifiedBy ?? null,
    verifiedAt: r.verifiedAt ? new Date(r.verifiedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
    ...(r.updatedAt ? { updatedAt: new Date(r.updatedAt).toISOString() } : {}),
    ...(extra ? { user: extra.userName ?? null, userEmail: extra.userEmail ?? null, verifiedByName: extra.verifiedByName ?? null } : {}),
  };
}