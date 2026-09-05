"use client";

import { useState } from "react";
import { Smartphone, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmPurchaseDialog, TransactionResult } from "@/components/shared/transaction-result";
import { NETWORKS, detectNetwork } from "@/lib/constants";
import { apiFetch } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { VtuTransaction } from "@/types";

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimePage() {
  const [network, setNetwork] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ transaction: VtuTransaction; providerResponse?: { message?: string } } | null>(null);

  const detected = phone ? detectNetwork(phone) : null;
  const numericPhone = phone.replace(/[^\d]/g, "");
  const numericAmount = Number(amount) || 0;
  const canSubmit = network && numericPhone.length >= 10 && numericAmount >= 50;

  function openConfirm() {
    if (!network) return toast.error("Please select a network provider");
    if (numericPhone.length < 10) return toast.error("Enter a valid phone number");
    if (numericAmount < 50) return toast.error("Minimum airtime amount is ₦50");
    if (detected && detected !== network)
      return toast.error(`This number is on ${detected}. Switch network to match?`, { description: "The number prefix belongs to a different network." });
    setConfirmOpen(true);
  }

  async function confirmPurchase() {
    setLoading(true);
    const res = await apiFetch<{ transaction: VtuTransaction; providerResponse: { message?: string } }>("/api/airtime", {
      method: "POST",
      body: JSON.stringify({ network, phone: numericPhone, amount: numericAmount }),
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
            <Smartphone className="size-5 text-royal-600 dark:text-royal-400" /> Buy Airtime
          </CardTitle>
          <CardDescription>Choose a network, enter the number and amount.</CardDescription>
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
                    network === n.code
                      ? "border-royal-600 bg-royal-500/5 shadow-md"
                      : "border-border/70 hover:border-border"
                  }`}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold"
                    style={{ backgroundColor: n.color, color: n.textColor }}
                  >
                    {n.code[0]}
                  </span>
                  <span className="text-sm font-semibold">{n.name}</span>
                  {network === n.code && <Badge variant="info">Selected</Badge>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 08031234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                className="pr-24"
              />
              <span className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                {detected ? (
                  <Badge variant="info">
                    <Search className="size-3" /> {detected}
                  </Badge>
                ) : phone ? (
                  <Badge variant="muted">Unknown</Badge>
                ) : null}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Network is auto-detected from the number prefix.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min={50}
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1.5">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    Number(amount) === a
                      ? "border-royal-600 bg-royal-500/10 text-royal-700 dark:text-royal-300"
                      : "border-border/70 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  ₦{a.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={openConfirm} disabled={!canSubmit}>
            Continue — {numericAmount >= 50 ? formatNaira(numericAmount) : "₦0.00"}
          </Button>
        </CardContent>
      </Card>

      {(result || confirmOpen) && (
        <Card className="gap-0">
          <CardContent className="py-6">
            {confirmOpen ? (
              <ConfirmPurchaseDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirm airtime purchase"
                description="Review your purchase before paying."
                rows={[
                  { label: "Network", value: network },
                  { label: "Phone number", value: numericPhone },
                ]}
                amount={numericAmount}
                onConfirm={confirmPurchase}
                loading={loading}
              />
            ) : result ? (
              <TransactionResult
                transaction={result.transaction}
                providerResponse={result.providerResponse}
                onDone={() => {
                  setResult(null);
                  setPhone("");
                  setAmount("");
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}