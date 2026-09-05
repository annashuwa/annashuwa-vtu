"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmPurchaseDialog, TransactionResult } from "@/components/shared/transaction-result";
import { apiFetch } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { ServiceProvider, VtuTransaction } from "@/types";

export default function ElectricityPage() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<{ name: string; address?: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ transaction: VtuTransaction; providerResponse?: Record<string, unknown> & { message?: string } } | null>(null);

  const numericMeter = meterNumber.replace(/[^\d]/g, "");
  const numericAmount = Number(amount) || 0;

  useEffect(() => {
    apiFetch<{ providers: ServiceProvider[] }>("/api/electricity/providers")
      .then((res) => {
        if (!res.error) setProviders(res.data?.providers ?? []);
      })
      .finally(() => setLoadingProviders(false));
  }, []);

  async function validateMeter() {
    if (!provider) return toast.error("Select a provider");
    if (numericMeter.length < 6) return toast.error("Enter a valid meter number");
    setValidating(true);
    setValidated(null);
    const res = await apiFetch<{ name: string; address?: string }>("/api/electricity/validate", {
      method: "POST",
      body: JSON.stringify({ provider: provider.code, meterNumber: numericMeter, meterType }),
    });
    setValidating(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setValidated({ name: res.data!.name, address: res.data!.address });
    toast.success("Meter verified");
  }

  function openConfirm() {
    if (!provider) return toast.error("Select a provider");
    if (!validated) return toast.error("Validate the meter number first");
    if (numericAmount < 500) return toast.error("Minimum payment is ₦500");
    setConfirmOpen(true);
  }

  async function confirmPurchase() {
    setLoading(true);
    const res = await apiFetch<{ transaction: VtuTransaction; providerResponse: Record<string, unknown> & { message?: string } }>("/api/electricity", {
      method: "POST",
      body: JSON.stringify({
        provider: provider!.code,
        meterNumber: numericMeter,
        meterType,
        amount: numericAmount,
      }),
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    setResult({ transaction: res.data!.transaction, providerResponse: res.data!.providerResponse });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="size-5 text-gold-600 dark:text-gold-400" /> Pay Electricity
          </CardTitle>
          <CardDescription>Choose your distribution company, validate the meter and pay.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block">Distribution company</Label>
            {loadingProviders ? (
              <div className="grid gap-2.5 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      setValidated(null);
                    }}
                    className={`flex items-center justify-center rounded-xl border-2 px-3 py-3 text-center transition-all ${
                      provider?.code === p.code
                        ? "border-gold-500 bg-gold-500/5 shadow-sm"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    <span className="text-xs font-bold">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Meter type</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["prepaid", "postpaid"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setMeterType(t);
                    setValidated(null);
                  }}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold capitalize transition-all ${
                    meterType === t
                      ? "border-royal-600 bg-royal-500/5"
                      : "border-border/70 text-muted-foreground hover:border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meter">Meter number</Label>
            <Input
              id="meter"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 12345678912"
              value={meterNumber}
              onChange={(e) => { setMeterNumber(e.target.value.replace(/[^\d]/g, "")); setValidated(null); }}
            />
          </div>

          <Button variant="outlineEmerald" className="w-full" onClick={validateMeter} disabled={validating || numericMeter.length < 6}>
            {validating ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {validated ? "Re-validate meter" : "Validate meter"}
          </Button>

          {validated && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Customer verified
              </div>
              <div className="mt-1 text-lg font-bold">{validated.name}</div>
              {validated.address && <div className="text-sm text-muted-foreground">{validated.address}</div>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min={500}
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              A convenience fee of {provider ? formatNaira(Number(provider.fee)) : "₦100"} will apply.
            </p>
          </div>

          <Button className="w-full" size="lg" onClick={openConfirm} disabled={!provider || numericAmount < 500}>
            Continue — {numericAmount >= 500 ? formatNaira(numericAmount) : "Enter amount"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="gap-0">
          <CardContent className="py-6">
            <TransactionResult
              transaction={result.transaction}
              providerResponse={result.providerResponse}
              onDone={() => {
                setResult(null);
                setValidated(null);
                setAmount("");
                setMeterNumber("");
              }}
            />
          </CardContent>
        </Card>
      )}

      {confirmOpen && provider && (
        <ConfirmPurchaseDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm electricity payment"
          description="Review your payment before confirming."
          rows={[
            { label: "Provider", value: provider.name },
            { label: "Meter type", value: meterType },
            { label: "Meter number", value: numericMeter },
            { label: "Customer", value: validated?.name ?? "" },
            { label: "Fee", value: formatNaira(Number(provider.fee)) },
          ]}
          amount={numericAmount}
          fee={Number(provider.fee)}
          onConfirm={confirmPurchase}
          loading={loading}
        />
      )}
    </div>
  );
}