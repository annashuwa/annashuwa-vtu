"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tv, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmPurchaseDialog, TransactionResultDialog, TransactionErrorDialog } from "@/components/shared/transaction-result";
import { apiFetch } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { ServiceProvider, ServicePackage, VtuTransaction } from "@/types";

export default function CablePage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [smartCard, setSmartCard] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<{ name: string } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ transaction: VtuTransaction; providerResponse?: { message?: string } } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const numericCard = smartCard.replace(/\D/g, "");

  useEffect(() => {
    apiFetch<{ providers: ServiceProvider[] }>("/api/cable/providers")
      .then((res) => {
        if (!res.error) setProviders(res.data?.providers ?? []);
      })
      .finally(() => setLoadingProviders(false));
  }, []);

  async function validateCard() {
    if (!provider) return toast.error("Select a provider");
    if (numericCard.length < 6) return toast.error("Enter a valid smart card number");
    setValidating(true);
    setValidated(null);
    const res = await apiFetch<{ name: string }>("/api/cable/validate", {
      method: "POST",
      body: JSON.stringify({ provider: provider.code, smartCard: numericCard }),
    });
    setValidating(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setValidated({ name: res.data!.name });
    toast.success("Customer verified");
  }

  function openConfirm() {
    if (!provider) return toast.error("Select a provider");
    if (!validated) return toast.error("Validate the smart card first");
    if (!selectedPackage) return toast.error("Select a package");
    setConfirmOpen(true);
  }

  async function confirmPurchase() {
    setLoading(true);
    const res = await apiFetch<{ transaction: VtuTransaction; providerResponse: { message?: string } }>("/api/cable", {
      method: "POST",
      body: JSON.stringify({ provider: provider!.code, smartCard: numericCard, packageId: selectedPackage!.id }),
    });
    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    setResult({ transaction: res.data!.transaction, providerResponse: res.data!.providerResponse });
    // Refresh server components (layout shell / topbar) so every balance on
    // screen debits instantly instead of waiting for a manual refresh.
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tv className="size-5 text-violet-600 dark:text-violet-400" /> Cable TV Subscription
          </CardTitle>
          <CardDescription>Subscribe for DStv, GOtv or StarTimes packages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block">Provider</Label>
            {loadingProviders ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      setValidated(null);
                      setSelectedPackage(null);
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition-all ${
                      provider?.code === p.code
                        ? "border-violet-600 bg-violet-500/5 shadow-sm"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    <span className="text-sm font-bold">{p.name}</span>
                    <Badge variant="muted">{p.packages?.length ?? 0} plans</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smartcard">Smart card / IUC number</Label>
            <Input
              id="smartcard"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 70301234567"
              value={smartCard}
              onChange={(e) => { setSmartCard(e.target.value.replace(/\D/g, "")); setValidated(null); }}
            />
          </div>

          <Button variant="outlineEmerald" className="w-full" onClick={validateCard} disabled={validating || numericCard.length < 6}>
            {validating ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {validated ? "Re-validate card" : "Validate smart card"}
          </Button>

          {validated && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="size-4" />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Customer verified
                </div>
                <div className="text-lg font-bold">{validated.name}</div>
              </div>
            </div>
          )}

          {provider && provider.packages && provider.packages.length > 0 && (
            <div>
              <Label className="mb-2 block">Select package</Label>
              <div className="space-y-2">
                {provider.packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      selectedPackage?.id === pkg.id
                        ? "border-violet-600 bg-violet-500/5 shadow-sm"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{pkg.name}</div>
                      {pkg.duration && <div className="text-xs text-muted-foreground">{pkg.duration}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-violet-700 dark:text-violet-400">{formatNaira(pkg.price)}</div>
                      {pkg.oldPrice && (
                        <div className="text-[11px] text-muted-foreground line-through">{formatNaira(Number(pkg.oldPrice))}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" size="lg" onClick={openConfirm} disabled={!selectedPackage}>
            Continue — {selectedPackage ? formatNaira(Number(selectedPackage.price)) : "Select a package"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <TransactionResultDialog
          open={!!result}
          onOpenChange={(o) => {
            if (!o) setResult(null);
          }}
          transaction={result.transaction}
          providerResponse={result.providerResponse}
          onDone={() => {
            setResult(null);
            setValidated(null);
            setSelectedPackage(null);
            setSmartCard("");
          }}
        />
      )}

      <TransactionErrorDialog open={!!errorMsg} onOpenChange={(o) => !o && setErrorMsg(null)} message={errorMsg ?? ""} />

      {confirmOpen && provider && (
        <ConfirmPurchaseDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm cable subscription"
          description="Review your subscription before paying."
          rows={[
            { label: "Provider", value: provider.name },
            { label: "Smart card", value: numericCard },
            { label: "Customer", value: validated?.name ?? "" },
            { label: "Package", value: selectedPackage?.name ?? "" },
            { label: "Fee", value: formatNaira(Number(provider.fee)) },
          ]}
          amount={selectedPackage ? Number(selectedPackage.price) : 0}
          fee={Number(provider.fee)}
          onConfirm={confirmPurchase}
          loading={loading}
        />
      )}
    </div>
  );
}