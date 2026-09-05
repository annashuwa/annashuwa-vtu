import { AIRTIME_CASH_STATUS_LABELS } from "@/lib/constants";

export function A2CStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: "text-emerald-600 dark:text-emerald-400",
    REJECTED: "text-destructive",
    FAILED: "text-destructive",
    PENDING: "text-royal-600 dark:text-royal-400",
    VERIFYING: "text-gold-600 dark:text-gold-400",
    CANCELLED: "text-muted-foreground",
  };
  return (
    <span className={`text-[11px] font-semibold ${map[status] ?? "text-muted-foreground"}`}>
      {AIRTIME_CASH_STATUS_LABELS[status] ?? status}
    </span>
  );
}
