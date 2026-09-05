"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Users,
  ReceiptText,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/dashboard/stats-cards";
import { apiFetch } from "@/lib/api";
import { formatNaira, formatNumber, formatDateTime } from "@/lib/utils";
import { serviceLabels } from "@/lib/constants";
import type { AdminStats } from "@/types";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminStats>("/api/admin/stats")
      .then((res) => {
        if (res.error) toast.error(res.error);
        else setStats(res.data!);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!stats) return null;

  const cards = [
    { label: "Total revenue", value: formatNaira(stats.totalRevenue), icon: TrendingUp, tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Total users", value: formatNumber(stats.totalUsers), icon: Users, tone: "text-royal-600 bg-royal-500/10" },
    { label: "Transactions", value: formatNumber(stats.totalTransactions), icon: ReceiptText, tone: "text-gold-600 bg-gold-500/10" },
    { label: "Pending", value: formatNumber(stats.pendingTransactions), icon: Activity, tone: "text-destructive bg-destructive/10" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="gap-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex size-10 items-center justify-center rounded-lg ${c.tone}`}>
                <c.icon className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none">{c.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Volume — last 7 days</CardTitle>
            <CardDescription>Total value processed per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.volumeByDay} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                <Tooltip formatter={(v) => formatNaira(Number(v))} />
                <Area type="monotone" dataKey="successful" name="Successful" stroke="#059669" fill="url(#gSuccess)" strokeWidth={2} />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Volume by service</CardTitle>
            <CardDescription>Successful spend per service type.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.volumeByService.map((s) => ({ ...s, label: serviceLabels[s.serviceType] ?? s.serviceType }))} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                <Tooltip formatter={(v) => formatNaira(Number(v))} />
                <Bar dataKey="total" name="Volume" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/70">
              {stats.recentTransactions.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.user}</div>
                    <div className="text-xs text-muted-foreground">
                      {serviceLabels[t.serviceType] ?? t.serviceType} · {t.provider}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatNaira(t.amount)}</div>
                    <StatusPill status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle>Recent signups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/70">
              {stats.recentUsers.slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={u.status === "ACTIVE" ? "success" : "destructive"}>{u.status}</Badge>
                    <div className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(u.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}