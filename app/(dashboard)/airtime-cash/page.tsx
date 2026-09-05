"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NETWORKS } from "@/lib/constants";
import { apiFetch } from "@/lib/api";
import { formatNaira, formatDateTime } from "@/lib/utils";
import { A2CStatusPill } from "@/components/shared/airtime-cash-status";
import type { AirtimeCashRequest, AirtimeCashNetworkConfig } from "@/types";

export default function AirtimeCashPage() {
  const [config, setConfig] = useState<AirtimeCashNetworkConfig[]>([]);
  const [network, setNetwork] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detail, setDetail] = useState<AirtimeCashRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<
    { reference: string; status: string; netAmount: string; network: string; amount: string } | null
  >(null);
  const [requests, setRequests] = useState<AirtimeCashRequest[]>([]);

  const networkCfg = config.find((c) => c.network === network);
  const numericAmount = Number(amount) || 0;
  const gross = networkCfg && numericAmount > 0 ? Math.round((numericAmount * networkCfg.conversionRate) / 100) : 0;
  const fee = networkCfg ? Number(networkCfg.fee) : 0;
  const net = Math.max(0, gross - fee);
  const numericPhone = phone.replace(/[^\d]/g, "");
  const canStep3 = networkCfg && numericAmount >= networkCfg.minAmount && numericAmount <= networkCfg.maxAmount;
  const canStep4 = canStep3 && numericPhone.length >= 10;

  const loadHistory = useCallback(async () => {
    const res = await apiFetch<{ requests: AirtimeCashRequest[] }>("/api/airtime-cash");
    if (!res.error && res.data) setRequests(res.data.requests);
  }, []);

  useEffect(() => {
    apiFetch<{ networks: AirtimeCashNetworkConfig[] }>("/api/airtime-cash/config").then((res) => {
      if (!res.error && res.data) setConfig(res.data.networks);
    });
    loadHistory();
  }, [loadHistory]);

  function selectNetwork(code: string) {
    setNetwork(code);
    setStep(2);
  }

  function goForward() {
    if (step === 1) return;
    if (step === 2) {
      if (!canStep3) {
        const msg = networkCfg
          ? `Amount must be between ${formatNaira(networkCfg.minAmount)} and ${formatNaira(networkCfg.maxAmount)}`
          : "Select a network first";
        return toast.error(msg);
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (numericPhone.length < 10) return toast.error("Enter the phone number you sent the airtime from");
      setStep(4);
    }
  }

  async function submitRequest() {
    setSubmitting(true);
    const res = await apiFetch<{ reference: string; status: string; netAmount: string; network: string; amount: string }>(
      "/api/airtime-cash/request",
      {
        method: "POST",
        body: JSON.stringify({ network, phone: numericPhone, amount: numericAmount }),
      }
    );
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      setConfirmOpen(false);
      return;
    }
    setCreated(res.data!);
    setConfirmOpen(false);
    await loadHistory();
  }

  function reset() {
    setCreated(null);
    setStep(1);
    setNetwork("");
    setAmount("");
    setPhone("");
  }

  async function copyReceiving() {
    if (!networkCfg?.receivingNumber) return;
    try {
      await navigator.clipboard.writeText(networkCfg.receivingNumber);
      toast.success("Receiving number copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card className="gap-0">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-gold-500/10 text-gold-600">
              <Clock3 className="size-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Request submitted</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Your airtime transfer is now pending verification. Your wallet will be credited once an
                administrator confirms the transfer.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-1.5 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
              <Row label="Reference" value={created.reference} mono />
              <Row label="Network" value={created.network} />
              <Row label="Airtime amount" value={formatNaira(Number(created.amount))} />
              <Row label="Status" value={<A2CStatusPill status={created.status} />} />
            </div>
            <Button onClick={reset} variant="outline">
              Make another request
            </Button>
          </CardContent>
        </Card>
        <HistoryList requests={requests} onOpen={setDetail} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="size-5 text-royal-600 dark:text-royal-400" /> Airtime to Cash
          </CardTitle>
          <CardDescription>Convert your mobile airtime into wallet cash.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Stepper */}
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {["Network", "Amount", "Transfer", "Confirm"].map((s, i) => {
              const n = (i + 1) as 1 | 2 | 3 | 4;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      step === n || (step > n && n !== 4)
                        ? "bg-royal-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n}
                  </span>
                  <span className={step === n ? "text-foreground" : ""}>{s}</span>
                  {n < 4 && <div className="h-px w-6 bg-border sm:w-10" />}
                </div>
              );
            })}
          </div>

          {step === 1 && (
            <div>
              <Label className="mb-2 block">Select your airtime network</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {NETWORKS.map((n) => {
                  const cfg = config.find((c) => c.network === n.code);
                  const disabled = cfg ? !cfg.enabled : false;
                  return (
                    <button
                      key={n.code}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectNetwork(n.code)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                        disabled
                          ? "cursor-not-allowed border-border/40 opacity-40"
                          : "border-border/70 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold"
                        style={{ backgroundColor: n.color, color: n.textColor }}
                      >
                        {n.code[0]}
                      </span>
                      <span className="text-sm font-semibold">{n.name}</span>
                      {disabled && <Badge variant="muted">Unavailable</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && networkCfg && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="px-2">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Badge variant="info">{network}</Badge>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Airtime amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">₦</span>
                  <Input
                    id="amount"
                    type="number"
                    min={networkCfg.minAmount}
                    max={networkCfg.maxAmount}
                    placeholder={`e.g. ${networkCfg.minAmount.toLocaleString()}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Minimum: {formatNaira(networkCfg.minAmount)} · Maximum: {formatNaira(networkCfg.maxAmount)}
                </p>
              </div>
              {numericAmount >= networkCfg.minAmount && (
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You&apos;ll receive (est.)</span>
                    <span className="font-bold">{formatNaira(net)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Rate: {networkCfg.conversionRate}% · Fee: {formatNaira(fee)}</span>
                  </div>
                </div>
              )}
              <Button className="w-full" size="lg" onClick={goForward}>
                Continue
              </Button>
            </div>
          )}

          {step === 3 && networkCfg && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="px-2">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Badge variant="info">{network}</Badge>
              </div>

              <div className="rounded-xl border-2 border-dashed border-gold-500/40 bg-gold-500/5 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transfer your airtime to
                </p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-2xl font-extrabold tracking-wide">
                    {networkCfg.receivingNumber ?? "Not configured"}
                  </span>
                  {networkCfg.receivingNumber && (
                    <button onClick={copyReceiving} aria-label="Copy number" className="text-muted-foreground hover:text-foreground">
                      <Copy className="size-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Only transfer the exact amount you entered ({formatNaira(numericAmount)}).
                </p>
              </div>

              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                <Info className="size-4 shrink-0" />
                <div>
                  Make sure you selected the correct network. Transfer exactly <b>{formatNaira(numericAmount)}</b> of{" "}
                  <b>{network}</b> airtime to the number above, then enter the phone number you sent the airtime from.
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sender">Phone number you sent the airtime from</Label>
                <Input
                  id="sender"
                  type="tel"
                  placeholder="e.g. 08031234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter the same number that sent the airtime. This is used to verify your transfer.
                </p>
              </div>

              <Button className="w-full" size="lg" onClick={goForward} disabled={!canStep4}>
                Continue
              </Button>
            </div>
          )}

          {step === 4 && networkCfg && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="px-2">
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Badge variant="info">Review your request</Badge>
              </div>

              <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
                <Row label="Network" value={network} />
                <Row label="Airtime amount" value={formatNaira(numericAmount)} />
                <Row label="Sender number" value={numericPhone} />
                <Row label="Receiving number" value={networkCfg.receivingNumber ?? "—"} />
                <div className="my-1 border-t border-border/70" />
                <Row label="Conversion rate" value={`${networkCfg.conversionRate}%`} />
                <Row label="Gross cash" value={formatNaira(gross)} />
                {fee > 0 && <Row label="Processing fee" value={`-${formatNaira(fee)}`} />}
                <Row label="Estimated wallet credit" value={<span className="text-base font-bold">{formatNaira(net)}</span>} />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Cancel
                </Button>
                <Button variant="emerald" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                  <CheckCircle2 className="size-4" /> Submit request
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <HistoryList requests={requests} onOpen={setDetail} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm airtime-to-cash request</DialogTitle>
            <DialogDescription>
              You are transferring {formatNaira(numericAmount)} of {network} airtime to receive {formatNaira(net)} in
              your wallet after verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
            <Row label="Network" value={network} />
            <Row label="Airtime" value={formatNaira(numericAmount)} />
            <Row label="Sender" value={numericPhone} />
            <Row label="Receiving" value={networkCfg?.receivingNumber ?? "—"} />
            <Row label="You receive" value={formatNaira(net)} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="emerald" onClick={submitRequest} disabled={submitting}>
              {submitting ? "Submitting..." : "Confirm & submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request details</DialogTitle>
            <DialogDescription>{detail?.reference}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
              <Row label="Network" value={detail.network} />
              <Row label="Airtime amount" value={formatNaira(Number(detail.amount))} />
              <Row label="Cash amount" value={formatNaira(Number(detail.netAmount))} />
              <Row label="Sender" value={detail.phone} />
              <Row label="Receiving" value={detail.receivingPhone ?? "—"} />
              <Row label="Status" value={<A2CStatusPill status={detail.status} />} />
              <Row label="Date" value={formatDateTime(detail.createdAt)} />
              {detail.verificationNotes && (
                <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {detail.verificationNotes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryList({
  requests,
  onOpen,
}: {
  requests: AirtimeCashRequest[];
  onOpen: (r: AirtimeCashRequest) => void;
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-center justify-between px-5 py-4">
        <CardTitle className="text-base">Your airtime-to-cash history</CardTitle>
        <Badge variant="muted">{requests.length}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {requests.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No airtime-to-cash requests yet.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {requests.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onOpen(r)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{r.network}</span>
                      <Badge variant="muted">{formatNaira(Number(r.amount))}</Badge>
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">{r.reference}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatNaira(Number(r.netAmount))}</div>
                    <A2CStatusPill status={r.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
