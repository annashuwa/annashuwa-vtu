import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ReceiptText, TrendingUp, Clock, Search } from "lucide-react";
import type { VtuTransaction } from "@/types";
import { formatNaira, formatDateTime } from "@/lib/utils";

export function StatsCards({ total, successful, pending, failed }: { total: number; successful: number; pending: number; failed: number }) {
  const items = [
    { label: "Total transactions", value: total, icon: ReceiptText, className: "text-royal-700 bg-royal-500/10 dark:text-royal-400" },
    { label: "Successful", value: successful, icon: TrendingUp, className: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" },
    { label: "Pending", value: pending, icon: Clock, className: "text-gold-600 bg-gold-500/10 dark:text-gold-400" },
    { label: "Failed", value: failed, icon: ArrowDownToLine, className: "text-destructive bg-destructive/10" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <Card key={s.label} className="gap-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex size-10 items-center justify-center rounded-lg ${s.className}`}>
              <s.icon className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-bold leading-none">{s.value.toLocaleString("en-NG")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RecentTransactions({ items }: { items: VtuTransaction[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
        <Search className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No transactions yet. Start by buying airtime or data.</p>
      </div>
    );
  }
  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-center justify-between px-5 py-4">
        <CardTitle className="text-base">Recent transactions</CardTitle>
        <a href="/transactions" className="text-sm font-medium text-primary hover:underline">
          View all
        </a>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/70">
          {items.slice(0, 6).map((t) => (
            <li key={t.id}>
              <a
                href={`/receipt/${t.reference}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{t.provider}</span>
                    <Badge variant="muted">{t.serviceType.replace(/_/g, " ").toLowerCase()}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatNaira(t.amount)}</div>
                  <StatusPill status={t.status} />
                </div>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUCCESSFUL: "text-emerald-600 dark:text-emerald-400",
    FAILED: "text-destructive",
    PENDING: "text-royal-600 dark:text-royal-400",
    PROCESSING: "text-gold-600 dark:text-gold-400",
  };
  return <span className={`text-[11px] font-semibold ${map[status] ?? "text-muted-foreground"}`}>{status}</span>;
}