import { Badge } from "@/components/ui/badge";
import type { TxnStatus } from "@/types";

const variantMap: Record<TxnStatus, "success" | "warning" | "info" | "destructive" | "muted"> = {
  SUCCESSFUL: "success",
  PENDING: "info",
  PROCESSING: "warning",
  FAILED: "destructive",
  REFUNDED: "warning",
  REVERSED: "muted",
  PARTIAL_REFUND: "info",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as TxnStatus;
  return (
    <Badge variant={variantMap[s] ?? "muted"} className={className}>
      {status}
    </Badge>
  );
}

export function roleBadge(role: string) {
  return role === "ADMIN" ? "info" : "muted";
}