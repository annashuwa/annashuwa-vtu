"use client";

import { Loader2, CheckCircle2, XCircle, Clock3, ArrowRight, Copy, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatNaira, formatDateTime } from "@/lib/utils";
import type { VtuTransaction } from "@/types";

export function ConfirmPurchaseDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  amount,
  fee,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  rows: { label: string; value: React.ReactNode }[];
  amount: number;
  fee?: number;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/30 p-4">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium">{r.value}</span>
            </div>
          ))}
          <div className="my-1 border-t border-border/70" />
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-lg font-bold">{formatNaira(amount)}</span>
          </div>
          {typeof fee === "number" && fee > 0 && (
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Convenience fee</span>
              <span className="font-medium">{formatNaira(fee)}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="emerald" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Processing..." : "Confirm & pay"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TransactionResult({
  transaction,
  providerResponse,
  pins,
  serials,
  onDone,
}: {
  transaction: VtuTransaction;
  providerResponse?: { message?: string } & Record<string, unknown>;
  pins?: string[];
  serials?: string[];
  onDone?: () => void;
}) {
  const success = transaction.status === "SUCCESSFUL";
  const pending = transaction.status === "PENDING" || transaction.status === "PROCESSING";
  const failed = transaction.status === "FAILED";
  const refunded =
    transaction.status === "REFUNDED" ||
    transaction.status === "REVERSED" ||
    transaction.status === "PARTIAL_REFUND";

  const token =
    providerResponse && typeof providerResponse.token === "string"
      ? providerResponse.token
      : undefined;

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div
        className={`flex size-16 items-center justify-center rounded-full ${
          success
            ? "bg-emerald-500/10 text-emerald-500"
            : pending
              ? "bg-gold-500/10 text-gold-600"
              : "bg-destructive/10 text-destructive"
        }`}
      >
        {success ? (
          <CheckCircle2 className="size-9" />
        ) : pending ? (
          <Clock3 className="size-9" />
        ) : failed || refunded ? (
          <XCircle className="size-9" />
        ) : null}
      </div>
      <div>
        <h3 className="text-xl font-bold">
          {success
            ? "Transaction successful"
            : pending
              ? "Processing"
              : failed
                ? "Transaction failed"
                : refunded
                  ? "Transaction refunded"
                  : ""}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {providerResponse?.message ?? transaction.description ?? "Transaction completed."}
        </p>
      </div>

      {token && (
        <div className="w-full max-w-sm space-y-2 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Electricity token
          </div>
          <button
            onClick={() => copyText(token)}
            className="w-full rounded-md bg-muted px-3 py-2 text-xl font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300 hover:bg-muted/70"
            title="Click to copy"
          >
            {token}
          </button>
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Copy className="size-3" /> Click the token to copy it
          </p>
        </div>
      )}

      {pins && pins.length > 0 && (
        <div className="w-full max-w-sm space-y-2 rounded-xl border-2 border-dashed border-gold-500/40 bg-gold-500/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gold-700 dark:text-gold-400">
            Your PIN{serials ? "" : "s"}
          </div>
          {pins.map((pin) => (
            <button
              key={pin}
              onClick={() => copyText(pin)}
              className="flex w-full items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm font-mono font-bold text-navy-900 dark:text-gold-300 hover:bg-muted/70"
            >
              <span>{pin}</span>
              <Copy className="size-3.5 shrink-0 opacity-60" />
            </button>
          ))}
          {serials && serials.length > 0 && (
            <div className="pt-1 text-xs text-muted-foreground">
              Serial{serials.length > 1 ? "s" : ""}:{" "}
              <span className="font-mono font-medium">{serials.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-sm space-y-1.5 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono font-medium">{transaction.reference}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">{formatNaira(transaction.amount)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDateTime(transaction.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={success ? "success" : pending ? "warning" : "destructive"}>{transaction.status}</Badge></div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" asChild>
          <a href={`/receipt/${transaction.reference}`}>
            <Printer className="size-4" /> View receipt
          </a>
        </Button>
        <Button asChild>
          <a href="/dashboard">
            Back to dashboard <ArrowRight className="size-4" />
          </a>
        </Button>
        {onDone && (
          <Button variant="ghost" onClick={onDone}>
            Make another
          </Button>
        )}
      </div>
    </div>
  );
}