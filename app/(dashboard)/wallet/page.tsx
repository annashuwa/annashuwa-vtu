"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet as WalletIcon, ArrowDownToLine, Loader2, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { StatusPill } from "@/components/dashboard/stats-cards";
import { EmptyState } from "@/components/shared/states";
import { apiFetch } from "@/lib/api";
import { formatNaira, formatDateTime } from "@/lib/utils";
import type { WalletTransaction } from "@/types";

type GatewayOption = { value: string; label: string };

const gateways: GatewayOption[] = [
  { value: "TEST", label: "Test Gateway (dev)" },
  { value: "PAYSTACK", label: "Paystack" },
  { value: "FLUTTERWAVE", label: "Flutterwave" },
  { value: "MONNIFY", label: "Monnify" },
];

const quickTopUps = [1000, 5000, 10000, 20000];

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [fundOpen, setFundOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [gateway, setGateway] = useState("TEST");
  const [initializing, setInitializing] = useState(false);
  const [payment, setPayment] = useState<{ reference: string; message?: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const numericAmount = Number(amount) || 0;

  const loadWallet = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ wallet: { balance: string; availableBalance?: string; pendingBalance?: string }; transactions: WalletTransaction[] }>("/api/wallet");
    if (res.error) {
      toast.error(res.error);
    } else {
      setBalance(Number(res.data?.wallet.balance ?? 0));
      setAvailable(res.data?.wallet.availableBalance != null ? Number(res.data.wallet.availableBalance) : null);
      setPending(res.data?.wallet.pendingBalance != null ? Number(res.data.wallet.pendingBalance) : null);
      setTxns(res.data?.transactions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  async function startFunding() {
    if (numericAmount < 100) return toast.error("Minimum funding amount is ₦100");
    setInitializing(true);
    const res = await apiFetch<{ reference: string; message?: string }>("/api/wallet/fund", {
      method: "POST",
      body: JSON.stringify({ amount: numericAmount, gateway }),
    });
    setInitializing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setPayment({ reference: res.data!.reference, message: res.data!.message });
    toast.info(gateway === "TEST" ? "Test payment initialized — approve or decline to finish." : "Payment initiated");
  }

  async function resolveFunding(action: "success" | "decline") {
    if (!payment) return;
    setProcessing(true);
    const res = await apiFetch<{ status: string; balance?: number }>("/api/wallet/fund/confirm", {
      method: "POST",
      body: JSON.stringify({ reference: payment.reference, simulate: action }),
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data?.status === "SUCCESSFUL") {
      toast.success(`Wallet funded with ${formatNaira(numericAmount)}`);
    } else {
      toast.error("Payment was not completed.");
    }
    setPayment(null);
    setFundOpen(false);
    setAmount("");
    await loadWallet();
  }

  const deposits = txns.filter((t) => t.type === "DEPOSIT" || t.type === "ADJUSTMENT");
  const spends = txns.filter((t) => ["AIRTIME_PURCHASE", "DATA_PURCHASE", "ELECTRICITY_PAYMENT", "CABLE_SUBSCRIPTION", "EXAM_PIN_PURCHASE"].includes(t.type));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {loading && balance === null ? (
        <Skeleton className="h-44 rounded-2xl" />
      ) : (
        <WalletCard balance={balance ?? 0} available={available ?? undefined} pending={pending ?? undefined} />
      )}

      <Card className="gap-0">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Fund wallet</CardTitle>
            <CardDescription>We support multiple payment methods.</CardDescription>
          </div>
          <Button variant="gold" onClick={() => { setPayment(null); setFundOpen(true); }}>
            <ArrowDownToLine className="size-4" /> Fund
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {gateways.map((g) => (
            <Badge key={g.value} variant="muted">
              {g.label}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle className="text-base">Deposits</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : deposits.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No deposits yet" description="Fund your wallet to get started." />
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {deposits.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{t.description ?? t.type}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatNaira(Number(t.amount) >= 0 ? t.amount : -Number(t.amount))}</div>
                      <StatusPill status={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle className="text-base">Recent spending</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : spends.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No spending yet" description="Buy airtime or data to see spending here." />
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {spends.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{t.description ?? t.type}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{formatNaira(t.amount)}</div>
                      <StatusPill status={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={fundOpen} onOpenChange={(o) => { setFundOpen(o); if (!o) setPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WalletIcon className="size-5 text-emerald-600" /> Fund your wallet
            </DialogTitle>
            <DialogDescription>
              {payment
                ? "Complete the simulated payment to test the flow."
                : "Enter an amount and choose how you want to pay."}
            </DialogDescription>
          </DialogHeader>

          {!payment ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fn-amount">Amount</Label>
                <Input
                  id="fn-amount"
                  type="number"
                  min={100}
                  placeholder="e.g. 10000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {quickTopUps.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmount(String(a))}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        numericAmount === a
                          ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-border/70 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      ₦{a.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gateway">Payment method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {gateways.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGateway(g.value)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                        gateway === g.value
                          ? "border-emerald-600 bg-emerald-500/5"
                          : "border-border/70 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" size="lg" variant="emerald" onClick={startFunding} disabled={initializing || numericAmount < 100}>
                {initializing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                {initializing ? "Initializing..." : `Pay ${formatNaira(numericAmount)}`}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gold-500/25 bg-gold-500/5 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gold-700 dark:text-gold-400">
                  <ShieldCheck className="size-4" /> {gateway} test payment pending
                </div>
                <div className="mt-1 text-2xl font-extrabold">{formatNaira(numericAmount)}</div>
                <div className="text-xs text-muted-foreground">Reference: {payment.reference}</div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {payment.message ?? "In production this opens a secure gateway."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={processing}
                  onClick={() => resolveFunding("decline")}
                >
                  Decline (simulate failure)
                </Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  disabled={processing}
                  onClick={() => resolveFunding("success")}
                >
                  {processing ? <Loader2 className="size-4 animate-spin" /> : null}
                  Approve (simulate success)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}