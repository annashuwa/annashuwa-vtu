"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmPurchaseDialog, TransactionResult } from "@/components/shared/transaction-result";
import { apiFetch } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { ExamPinProduct, VtuTransaction } from "@/types";

export default function ExamPinsPage() {
  const [products, setProducts] = useState<ExamPinProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExamPinProduct | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [phone, setPhone] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ transaction: VtuTransaction; pins?: string[]; serials?: string[] } | null>(null);

  const qty = Math.max(1, Math.min(5, Number(quantity) || 1));

  useEffect(() => {
    apiFetch<{ products: ExamPinProduct[] }>("/api/exam-pins")
      .then((res) => {
        if (!res.error) setProducts(res.data?.products ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function openConfirm() {
    if (!selected) return toast.error("Select an exam PIN product");
    setConfirmOpen(true);
  }

  async function confirmPurchase() {
    setSubmitting(true);
    const res = await apiFetch<{ transaction: VtuTransaction; pins?: string[]; serials?: string[] }>(
      "/api/exam-pins/purchase",
      {
        method: "POST",
        body: JSON.stringify({ productId: selected!.id, quantity: qty, phone: phone || undefined }),
      }
    );
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    setResult({ transaction: res.data!.transaction, pins: res.data?.pins, serials: res.data?.serials });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="size-5 text-rose-600 dark:text-rose-400" /> Exam PINs
          </CardTitle>
          <CardDescription>Purchase WAEC, NECO, NABTEB and JAMB pins instantly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block">Select exam</Label>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                      selected?.id === p.id
                        ? "border-rose-600 bg-rose-500/5 shadow-sm"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold">{p.name}</span>
                      <Badge variant="muted">{p.soldCount} sold</Badge>
                    </div>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatNaira(p.price)}</div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{p.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity (max 5)</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={5}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">SMS delivery number (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 08031234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
              />
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={openConfirm} disabled={!selected}>
            Continue — {selected ? formatNaira(Number(selected.price) * qty) : "Select an exam"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="gap-0">
          <CardContent className="py-6">
            <TransactionResult
              transaction={result.transaction}
              pins={result.pins}
              serials={result.serials}
              onDone={() => {
                setResult(null);
                setSelected(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {confirmOpen && selected && (
        <ConfirmPurchaseDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm PIN purchase"
          description="Your PIN(s) will be generated instantly after payment."
          rows={[
            { label: "Exam", value: selected.name },
            { label: "Quantity", value: String(qty) },
            { label: "Unit price", value: formatNaira(Number(selected.price)) },
            ...(phone ? [{ label: "SMS delivery", value: phone }] : []),
          ]}
          amount={Number(selected.price) * qty}
          onConfirm={confirmPurchase}
          loading={submitting}
        />
      )}
    </div>
  );
}