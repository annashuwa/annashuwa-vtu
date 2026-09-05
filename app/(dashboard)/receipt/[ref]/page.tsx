import { notFound } from "next/navigation";
import { ReceiptText } from "lucide-react";

import { PrintButton } from "@/components/shared/print-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/dashboard/stats-cards";
import { getSessionUser, getSessionToken, API_URL } from "@/lib/auth";
import { getProviderName, serviceLabels } from "@/lib/constants";
import { formatNaira, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReceiptTxn = {
  id: string;
  reference: string;
  serviceType: string;
  provider: string;
  customerInfo: string | null;
  amount: string;
  fee: string;
  status: string;
  description: string | null;
  metadata: string | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt?: string;
  user: { fullName: string; email: string };
};

export default async function ReceiptPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await getSessionUser();
  if (!user) notFound();

  const { ref } = await params;
  const token = await getSessionToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/transactions/${encodeURIComponent(ref)}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) notFound();
  const { transaction: tx } = (await res.json()) as { transaction: ReceiptTxn };

  const success = tx.status === "SUCCESSFUL";
  const meta = tx.metadata ? JSON.parse(tx.metadata) : undefined;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <ReceiptText className="size-5 text-royal-600 dark:text-royal-400" /> Receipt
        </div>
        <PrintButton />
      </div>

      <Card className="gap-0 print-mode">
        <CardHeader className="flex-row items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="size-6" />
            </div>
            <div>
              <div className="text-sm font-bold">ANNASHUWA VTU</div>
              <div className="text-xs text-muted-foreground">Transaction receipt</div>
            </div>
          </div>
          <Badge variant={success ? "success" : tx.status === "FAILED" ? "destructive" : "warning"}>
            {tx.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="rounded-xl bg-muted/40 p-4 text-center">
            <div className="text-xs text-muted-foreground">Amount paid</div>
            <div className="text-3xl font-extrabold">{formatNaira(Number(tx.amount))}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {getProviderName(tx.provider)} · {serviceLabels[tx.serviceType] ?? tx.serviceType}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <Row label="Reference" value={tx.reference} mono />
            <Row label="Service" value={serviceLabels[tx.serviceType] ?? tx.serviceType} />
            <Row label="Provider" value={getProviderName(tx.provider)} />
            {tx.customerInfo && <Row label="Customer" value={tx.customerInfo} />}
            <Row label="Date" value={formatDateTime(tx.createdAt)} />
            <Row label="Payment method" value={tx.paymentMethod ?? "Wallet balance"} />
            <Row label="Fee" value={formatNaira(Number(tx.fee))} />
            <Row label="Status" value={<StatusPill status={tx.status} />} />
          </div>

          {meta?.unitPrice != null && (
            <div className="space-y-2 text-sm">
              <Row label="Unit price" value={formatNaira(Number(meta.unitPrice))} />
            </div>
          )}
          {meta?.planName && (
            <div className="space-y-2 text-sm">
              <Row label="Plan" value={`${meta.planName} (${meta.size ?? ""})`} />
            </div>
          )}
          {meta?.discount && Number(meta.discount) > 0 && (
            <div className="space-y-2 text-sm">
              <Row label="Discount" value={`-${formatNaira(Number(meta.discount))}`} />
            </div>
          )}
          {meta?.commission && Number(meta.commission) > 0 && (
            <div className="space-y-2 text-sm">
              <Row label="Commission" value={formatNaira(Number(meta.commission))} />
            </div>
          )}

          {tx.description && (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
              {tx.description}
            </div>
          )}

          <div className="pt-2 text-center text-[11px] text-muted-foreground">
            Paid by {tx.user.fullName || user.fullName} ({tx.user.email || user.email})
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}