"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ServerCog, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import type { ProviderReadiness, RouteDecision } from "@/types";

const capLabels: { key: keyof ProviderReadiness["capabilities"]; label: string }[] = [
  { key: "airtime", label: "Airtime" },
  { key: "data", label: "Data" },
  { key: "electricity", label: "Electricity" },
  { key: "cable", label: "Cable" },
  { key: "examPins", label: "Exam Pins" },
];

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderReadiness[]>([]);
  const [active, setActive] = useState<string>("mock");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [service, setService] = useState("AIRTIME");
  const [routeAmount, setRouteAmount] = useState("100");
  const [route, setRoute] = useState<RouteDecision | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ providers: ProviderReadiness[]; active: string }>("/api/admin/vtu/providers");
    if (res.error) {
      toast.error(res.error);
    } else {
      setProviders(res.data?.providers ?? []);
      setActive(res.data?.active ?? "mock");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setActiveProvider(id: string) {
    setSaving(true);
    const res = await apiFetch<{ ok: boolean; active: string }>("/api/admin/vtu/active", {
      method: "POST",
      body: JSON.stringify({ providerId: id }),
    });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    setActive(res.data?.active ?? id);
    toast.success(`Active provider set to ${res.data?.active}`);
  }

  async function previewRoute() {
    setRouteLoading(true);
    const params = new URLSearchParams({ service, amount: routeAmount });
    const res = await apiFetch<RouteDecision>(`/api/admin/vtu/route?${params.toString()}`);
    setRouteLoading(false);
    if (res.error) return toast.error(res.error);
    setRoute(res.data!);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="size-5 text-primary" /> VTU providers
            </CardTitle>
            <CardDescription>
              Runtime readiness and control for the connected upstream providers.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="active-provider">Active provider</Label>
              <Select value={active} onValueChange={(v) => setActiveProvider(v)}>
                <SelectTrigger className="w-52" id="active-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Provider</th>
                    <th className="px-4 py-2.5">Mode</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Health</th>
                    <th className="px-4 py-2.5">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {providers.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.mode === "http" ? "success" : "muted"}>{p.mode}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={p.live ? "success" : "muted"}>{p.live ? "Live" : "Not configured"}</Badge>
                          {p.active && <Badge variant="info">Active</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.lastHealth?.ok ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Activity className="size-3.5" /> Ok ({p.lastHealth.latencyMs}ms)
                          </span>
                        ) : p.mode === "http" ? (
                          <span className="text-destructive">Unhealthy</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {capLabels
                            .filter((c) => p.capabilities[c.key])
                            .map((c) => (
                              <Badge key={c.key} variant="outline">
                                {c.label}
                              </Badge>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Routing preview</CardTitle>
          <CardDescription>Preview which provider the routing engine would pick.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc">Service</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger className="w-44" id="svc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["AIRTIME", "DATA", "ELECTRICITY", "CABLE", "EXAM_PIN"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount (₦)</Label>
              <Input id="amt" type="number" value={routeAmount} onChange={(e) => setRouteAmount(e.target.value)} className="w-32" />
            </div>
            <Button onClick={previewRoute} disabled={routeLoading || loading}>
              {routeLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Preview
            </Button>
          </div>

          {route && (
            <div className="rounded-lg border bg-muted/20 p-4">
              {route.selected ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{route.selected.name}</div>
                    <div className="text-xs text-muted-foreground">provider: {route.selected.providerId}</div>
                  </div>
                  <Badge variant={route.preferred ? "info" : "success"}>
                    {route.preferred ? "Preferred" : "Selected (cost-ranked)"}
                  </Badge>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No candidate provider is available for this service.</div>
              )}
              <div className="mt-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {route.candidates.length} candidate(s)
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {route.candidates.map((c) => (
                    <span key={c.providerId} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs">
                      {c.name}
                      {c.profit != null && <span className="text-emerald-600 dark:text-emerald-400">+{formatNaira(c.profit)}</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
