"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Play, Loader2, History } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ReconcileStatus, ReconcileSummaryData } from "@/types";

export default function AdminJobsPage() {
  const [status, setStatus] = useState<ReconcileStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ reconciliation: ReconcileStatus }>("/api/admin/jobs");
    if (res.error) {
      toast.error(res.error);
    } else {
      setStatus(res.data?.reconciliation ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runNow() {
    setRunning(true);
    const res = await apiFetch<{ ok: boolean; tookMs: number; summary: ReconcileSummaryData }>("/api/admin/jobs/reconcile", {
      method: "POST",
    });
    setRunning(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Reconciliation complete in ${(res.data?.tookMs ?? 0) / 1000}s`);
    await load();
  }

  const s = status;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" /> Background jobs
            </CardTitle>
            <CardDescription>Automated maintenance tasks that keep transactions consistent.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={runNow} disabled={running || s?.running}>
              {running || s?.running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading || !s ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge variant={s.enabled ? "success" : "muted"}>{s.enabled ? "Enabled" : "Disabled"}</Badge>
                <Badge variant={s.running ? "warning" : "outline"}>{s.running ? "Running" : "Idle"}</Badge>
                <Badge variant="outline">Run every {(s.intervalMs / 60_000).toFixed(0)} min</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Schedule</div>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Grace period</dt><dd>{(s.graceMs / 60_000).toFixed(0)} min</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Force-refund after</dt><dd>{(s.maxAgeMs / 60_000).toFixed(0)} min</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Batch size</dt><dd>—</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Last run</dt><dd>{s.lastRun ? formatDateTime(s.lastRun) : "Never"}</dd></div>
                  </dl>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last result</div>
                  {s.lastSummary ? (
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Examined</dt><dd>{s.lastSummary.examined}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Resolved</dt><dd className="font-semibold text-emerald-600 dark:text-emerald-400">{s.lastSummary.resolved}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Refunded</dt><dd className="font-semibold text-gold-700 dark:text-gold-400">{s.lastSummary.refunded}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Still pending</dt><dd>{s.lastSummary.stillPending}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Errors</dt><dd className={s.lastSummary.errors ? "text-destructive" : ""}>{s.lastSummary.errors}</dd></div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No run recorded yet.</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                PENDING / PROCESSING purchases older than the grace period are checked against the provider. Confirmed
                deliveries are marked SUCCESSFUL; failures — or transactions still unresolved past the force-refund window —
                are refunded automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
