import { getSessionUser, getSessionToken, API_URL } from "@/lib/auth";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatsCards, RecentTransactions } from "@/components/dashboard/stats-cards";
import type { VtuTransaction } from "@/types";

export const dynamic = "force-dynamic";

type TxnItem = {
  id: string;
  reference: string;
  serviceType: string;
  provider: string;
  customerInfo: string | null;
  amount: string;
  fee: string;
  status: string;
  description: string | null;
  paymentMethod: string | null;
  createdAt: string;
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const token = await getSessionToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const balance = Number(user.wallet?.balance ?? 0);
  const txnsRes = await fetch(`${API_URL}/api/transactions?pageSize=50`, {
    headers,
    cache: "no-store",
  });
  const txnsData = txnsRes.ok
    ? ((await txnsRes.json()) as { items?: TxnItem[]; total?: number })
    : { items: [], total: 0 };

  const recent = txnsData.items ?? [];
  const txns: VtuTransaction[] = recent.map((t) => ({
    id: t.id,
    reference: t.reference,
    serviceType: t.serviceType as VtuTransaction["serviceType"],
    provider: t.provider,
    customerInfo: t.customerInfo,
    amount: t.amount,
    fee: t.fee,
    status: t.status as VtuTransaction["status"],
    description: t.description,
    metadata: null,
    paymentMethod: t.paymentMethod,
    createdAt: t.createdAt,
    updatedAt: t.createdAt,
  }));

  const totalCount = txnsData.total ?? txns.length;
  const successfulCount = txns.filter((t) => t.status === "SUCCESSFUL").length;
  const pendingCount = txns.filter((t) => t.status === "PENDING" || t.status === "PROCESSING").length;
  const failedCount = txns.filter((t) => t.status === "FAILED").length;

  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, <span className="text-gradient-royal">{firstName}</span> 👋
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your account today.
        </p>
      </div>

      <WalletCard balance={balance} />

      <QuickActions />

      <StatsCards total={totalCount} successful={successfulCount} pending={pendingCount} failed={failedCount} />

      <RecentTransactions items={txns} />
    </div>
  );
}