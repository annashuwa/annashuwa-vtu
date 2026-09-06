"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wifi } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmPurchaseDialog, TransactionResultDialog, TransactionErrorDialog } from "@/components/shared/transaction-result";
import { NETWORKS, detectNetwork, type NetworkCode } from "@/lib/constants";
import { apiFetch } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { DataPlan as DataPlanType, VtuTransaction } from "@/types";

export default function DataPage() {
  const router = useRouter();
  const [network, setNetwork] = useState<NetworkCode | string>("MTN");
  const [plans, setPlans] = useState<DataPlanType[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<DataPlanType | null>(null);
  const [phone, setPhone] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ transaction: VtuTransaction; providerResponse?: { message?: string } } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const numericPhone = phone.replace(/[^\d]/g, "");

  useEffect(() => {
    setPlansLoading(true);
    setSelectedPlan(null);
    apiFetch<{ plans: DataPlanType[] }>(`/api/data/plans?network=${network}`)
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          setPlans([]);
        } else {
          setPlans(res.data?.plans ?? []);
        }
      })
      .finally(() => setPlansLoading(false));
  }, [network]);

  const detected = phone ? detectNetwork(phone) : null;
  const validPlan = selectedPlan && planMatchesNetwork(selectedPlan, network);
  const canSubmit = selectedPlan && numericPhone.length >= 10;

  function planMatchesNetwork(plan: DataPlanType, net: string) {
    return plan.network === net;
  }

  function openConfirm() {
    if (!selectedPlan) return toast.error("Select a data plan");
    if (numericPhone.length < 10) return toast.error("Enter a valid phone number");
    if (validPlan === false) return toast.error("Selected plan does not match the network");
    setConfirmOpen(true);
  }

  async function confirmPurchase() {
    setLoading(true);
    const res = await apiFetch<{ transaction: VtuTransaction; providerResponse: { message?: string } }>("/api/data", {
      method: "POST",
      body: JSON.stringify({ network, phone: numericPhone, planId: selectedPlan!.id }),
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wifi className="size-5 text-emerald-600 dark:text-emerald-400" /> Buy Data
          </CardTitle>
          <CardDescription>Pick a network, select a data plan and enter the phone number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block">Select network</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {NETWORKS.map((n) => (
                <button
                  key={n.code}
                  type="button"
                  onClick={() => setNetwork(n.code)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    network === n.code ? "border-emerald-600 bg-emerald-500/5 shadow-md" : "border-border/70 hover:border-border"
                  }`}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold"
                    style={{ backgroundColor: n.color, color: n.textColor }}
                  >
                    {n.code[0]}
                  </span>
                  <span className="text-sm font-semibold">{n.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Select data plan</Label>
            {plansLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                No data plans available for {network} right now.
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      selectedPlan?.id === plan.id
                        ? "border-emerald-600 bg-emerald-500/5 shadow-sm"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{plan.planName}</span>
                        <Badge variant="muted">{plan.validity}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{plan.size} · valid {plan.validity}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatNaira(plan.price)}</div>
                      {plan.oldPrice && (
                        <div className="text-[11px] text-muted-foreground line-through">{formatNaira(Number(plan.oldPrice))}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. 08031234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
            />
            {detected && detected !== network && (
              <p className="text-[11px] text-gold-600 dark:text-gold-400">
                This number is on {detected}, not {network}.
              </p>
            )}
          </div>

          <Button className="w-full" size="lg" onClick={openConfirm} disabled={!canSubmit}>
            Continue — {selectedPlan ? formatNaira(Number(selectedPlan.price)) : "Select a plan"}
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
            setPhone("");
            setSelectedPlan(null);
          }}
        />
      )}

      <TransactionErrorDialog open={!!errorMsg} onOpenChange={(o) => !o && setErrorMsg(null)} message={errorMsg ?? ""} />

      {confirmOpen && (
        <ConfirmPurchaseDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm data subscription"
          description="Review your subscription before paying."
          rows={[
            { label: "Network", value: network },
            { label: "Plan", value: `${selectedPlan?.planName} (${selectedPlan?.size})` },
            { label: "Validity", value: selectedPlan?.validity ?? "" },
            { label: "Phone number", value: numericPhone },
          ]}
          amount={selectedPlan ? Number(selectedPlan.price) : 0}
          onConfirm={confirmPurchase}
          loading={loading}
        />
      )}
    </div>
  );
}