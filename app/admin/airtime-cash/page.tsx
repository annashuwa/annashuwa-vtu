"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Eye, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { formatNaira, formatDateTime } from "@/lib/utils";
import { A2CStatusPill } from "@/components/shared/airtime-cash-status";
import type { AirtimeCashRequest, AirtimeCashNetworkConfig, Paginated } from "@/types";

const statusOptions = ["ALL", "PENDING", "VERIFYING", "APPROVED", "REJECTED", "FAILED", "CANCELLED"];

export default function AdminAirtimeCashPage() {
  const [tab, setTab] = useState("requests");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AirtimeCashRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<{ request: AirtimeCashRequest; type: "APPROVE" | "REJECT" } | null>(null);
  const [detail, setDetail] = useState<AirtimeCashRequest | null>(null);
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(false);

  const [config, setConfig] = useState<AirtimeCashNetworkConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status !== "ALL") params.set("status", status);
    const res = await apiFetch<Paginated<AirtimeCashRequest> & { requests?: AirtimeCashRequest[] }>(`/api/admin/airtime-cash?${params.toString()}`);
    if (res.error) toast.error(res.error);
    else {
      // The API returns the list under `requests`; accept `items` too so the
      // table can never silently render empty on a key mismatch.
      const d = res.data!;
      setData({
        items: d.requests ?? d.items ?? [],
        total: d.total ?? 0,
        page: d.page ?? page,
        pageSize: d.pageSize ?? 20,
        totalPages: d.totalPages ?? 1,
      });
    }
    setLoading(false);
  }, [page, status]);

  const loadConfig = useCallback(async () => {
    const res = await apiFetch<{ networks: AirtimeCashNetworkConfig[] }>("/api/admin/airtime-cash/config");
    if (!res.error && res.data) setConfig(res.data.networks);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => setPage(1), [status]);

  function openAction(r: AirtimeCashRequest, type: "APPROVE" | "REJECT") {
    setAction({ request: r, type });
    setNote("");
  }

  async function confirmAction() {
    if (!action) return;
    setActing(true);
    const path = action.type === "APPROVE" ? "approve" : "reject";
    const res = await apiFetch<{ status: string }>(`/api/admin/airtime-cash/${action.request.id}/${path}`, {
      method: "POST",
      body: JSON.stringify({ note: note || undefined }),
    });
    setActing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(action.type === "APPROVE" ? "Request approved & wallet credited" : "Request rejected");
    setAction(null);
    load();
    loadConfig();
  }

  async function beginVerify(id: string) {
    const res = await apiFetch<{ status: string }>(`/api/admin/airtime-cash/${id}/begin-verify`, { method: "POST" });
    if (res.error) return toast.error(res.error);
    toast.success("Marked as verifying");
    load();
  }

  function updateConfig(network: string, patch: Partial<AirtimeCashNetworkConfig>) {
    setConfig((prev) => prev.map((c) => (c.network === network ? { ...c, ...patch } : c)));
  }

  async function saveConfig() {
    setSavingConfig(true);
    const res = await apiFetch<{ ok: boolean }>("/api/admin/airtime-cash/config", {
      method: "PATCH",
      body: JSON.stringify({ networks: config }),
    });
    setSavingConfig(false);
    if (res.error) return toast.error(res.error);
    toast.success("Configuration saved");
    loadConfig();
  }

  const requests = data?.items ?? [];

  return (
    <Card className="gap-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="size-5 text-royal-600 dark:text-royal-400" /> Airtime to Cash
          </CardTitle>
          <CardDescription>Review requests and configure conversion settings.</CardDescription>
        </div>
        <Badge variant="muted">{data?.total ?? 0} total</Badge>
      </CardHeader>

      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "ALL" ? "All statuses" : s.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/60" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No airtime-to-cash requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5">Reference</th>
                      <th className="px-3 py-2.5">User</th>
                      <th className="px-3 py-2.5">Network</th>
                      <th className="px-3 py-2.5">Airtime</th>
                      <th className="px-3 py-2.5">Cash</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-3 py-3">
                          <button onClick={() => setDetail(r)} className="font-mono text-xs hover:underline">
                            {r.reference}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{r.user ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.userEmail ?? ""}</div>
                        </td>
                        <td className="px-3 py-3"><Badge variant="info">{r.network}</Badge></td>
                        <td className="px-3 py-3 font-semibold">{formatNaira(Number(r.amount))}</td>
                        <td className="px-3 py-3 text-emerald-600 dark:text-emerald-400">{formatNaira(Number(r.netAmount))}</td>
                        <td className="px-3 py-3"><A2CStatusPill status={r.status} /></td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => setDetail(r)} title="View">
                              <Eye className="size-4" />
                            </Button>
                            {(r.status === "PENDING" || r.status === "VERIFYING") && (
                              <>
                                {r.status === "PENDING" && (
                                  <Button variant="ghost" size="sm" onClick={() => beginVerify(r.id)} title="Mark verifying">
                                    Verify
                                  </Button>
                                )}
                                <Button variant="emerald" size="sm" onClick={() => openAction(r, "APPROVE")}>
                                  <CheckCircle2 className="size-3.5" /> Approve
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => openAction(r, "REJECT")}>
                                  <XCircle className="size-3.5" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                    <ChevronLeft className="size-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages || loading}>
                    Next <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Configure the receiving number, conversion rate, limits and fee for each network. The receiving number
                is what users transfer airtime to.
              </p>
              <Button variant="emerald" onClick={saveConfig} disabled={savingConfig}>
                <Save className="size-4" /> {savingConfig ? "Saving..." : "Save"}
              </Button>
            </div>
            <div className="space-y-4">
              {config.map((c) => (
                <Card key={c.network} className="gap-0">
                  <CardHeader className="flex-row items-center justify-between px-4 py-3">
                    <CardTitle className="text-base">{c.network}</CardTitle>
                    <Badge variant={c.enabled ? "success" : "muted"}>{c.enabled ? "Enabled" : "Disabled"}</Badge>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Receiving number</Label>
                      <Input
                        value={c.receivingNumber ?? ""}
                        onChange={(e) => updateConfig(c.network, { receivingNumber: e.target.value || null })}
                        placeholder="e.g. 08031234567"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Conversion rate (%)</Label>
                      <Input
                        type="number"
                        value={c.conversionRate}
                        onChange={(e) => updateConfig(c.network, { conversionRate: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fee (₦)</Label>
                      <Input
                        type="number"
                        value={c.fee}
                        onChange={(e) => updateConfig(c.network, { fee: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Min amount (₦)</Label>
                      <Input
                        type="number"
                        value={c.minAmount}
                        onChange={(e) => updateConfig(c.network, { minAmount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max amount (₦)</Label>
                      <Input
                        type="number"
                        value={c.maxAmount}
                        onChange={(e) => updateConfig(c.network, { maxAmount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={c.enabled}
                          onChange={(e) => updateConfig(c.network, { enabled: e.target.checked })}
                          className="size-4"
                        />
                        Enabled
                      </label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Approve/Reject dialog */}
      <Dialog open={Boolean(action)} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.type === "APPROVE" ? "Approve request" : "Reject request"}
            </DialogTitle>
            <DialogDescription>
              {action?.request.reference} · {action?.request.network} · {formatNaira(Number(action?.request.amount))}{" "}
              airtime → {formatNaira(Number(action?.request.netAmount))} cash
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action?.type === "REJECT" ? "Reason for rejection" : "Verification note"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button
              variant={action?.type === "APPROVE" ? "emerald" : "destructive"}
              onClick={confirmAction}
              disabled={acting}
            >
              {acting ? "Processing..." : action?.type === "APPROVE" ? "Approve & credit" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request details</DialogTitle>
            <DialogDescription>{detail?.reference}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
              <Row label="User" value={detail.user ?? "—"} />
              <Row label="Email" value={detail.userEmail ?? "—"} />
              <Row label="Network" value={detail.network} />
              <Row label="Airtime amount" value={formatNaira(Number(detail.amount))} />
              <Row label="Conversion rate" value={detail.conversionRate ? `${detail.conversionRate}%` : "—"} />
              <Row label="Gross cash" value={formatNaira(Number(detail.grossCashAmount))} />
              <Row label="Fee" value={formatNaira(Number(detail.fee))} />
              <Row label="Cash paid" value={<span className="font-bold text-emerald-600">{formatNaira(Number(detail.netAmount))}</span>} />
              <Row label="Sender" value={detail.phone} />
              <Row label="Receiving" value={detail.receivingPhone ?? "—"} />
              <Row label="Status" value={<A2CStatusPill status={detail.status} />} />
              <Row label="Date" value={formatDateTime(detail.createdAt)} />
              {detail.verifiedByName && <Row label="Verified by" value={detail.verifiedByName} />}
              {detail.verifiedAt && <Row label="Verified at" value={formatDateTime(detail.verifiedAt)} />}
              {detail.verificationNotes && (
                <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{detail.verificationNotes}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
