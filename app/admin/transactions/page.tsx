"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ReceiptText, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/dashboard/stats-cards";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { formatNaira, formatDateTime } from "@/lib/utils";
import { serviceLabels } from "@/lib/constants";
import type { Paginated } from "@/types";

type AdminTxn = {
  id: string;
  reference: string;
  serviceType: string;
  provider: string;
  customerInfo: string | null;
  amount: string;
  fee: string;
  status: string;
  paymentMethod: string | null;
  user: string;
  userEmail: string;
  createdAt: string;
};

const serviceOptions = [
  { value: "AIRTIME", label: "Airtime" },
  { value: "DATA", label: "Data" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "CABLE", label: "Cable" },
  { value: "EXAM_PIN", label: "Exam PIN" },
  { value: "WALLET_FUNDING", label: "Funding" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
];

export default function AdminTransactionsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [serviceType, setServiceType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminTxn> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, serviceType, status]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (serviceType !== "ALL") params.set("serviceType", serviceType);
    if (status !== "ALL") params.set("status", status);
    const res = await apiFetch<Paginated<AdminTxn>>(`/api/admin/transactions?${params.toString()}`);
    if (res.error) toast.error(res.error);
    else setData(res.data!);
    setLoading(false);
  }, [page, debouncedSearch, serviceType, status]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const items = data?.items ?? [];
    if (items.length === 0) return toast.error("Nothing to export on this page");
    const header = ["Reference", "Service", "Provider", "Customer", "Amount", "Fee", "Status", "User", "Email", "Date"];
    const rows = items.map((t) => [
      t.reference,
      t.serviceType,
      t.provider,
      t.customerInfo ?? "",
      Number(t.amount).toFixed(2),
      Number(t.fee).toFixed(2),
      t.status,
      t.user,
      t.userEmail,
      t.createdAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const txns = data?.items ?? [];

  return (
    <Card className="gap-0">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ReceiptText className="size-5 text-royal-600 dark:text-royal-400" /> Transactions
          </CardTitle>
          <CardDescription>All transactions across all users.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="muted">{data?.total ?? 0} total</Badge>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-3.5" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_140px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search reference, provider, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger>
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All services</SelectItem>
              {serviceOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {["SUCCESSFUL", "PENDING", "PROCESSING", "FAILED"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s.toLowerCase()}
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
        ) : txns.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Reference</th>
                  <th className="px-3 py-2.5">Service</th>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">Fee</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-3 font-mono text-xs">{t.reference}</td>
                    <td className="px-3 py-3">
                      <Badge variant="muted">{serviceLabels[t.serviceType] ?? t.serviceType}</Badge>
                      <div className="mt-0.5 text-xs text-muted-foreground">{t.provider}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{t.user}</div>
                      <div className="text-xs text-muted-foreground">{t.userEmail}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold">{formatNaira(t.amount)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatNaira(t.fee)}</td>
                    <td className="px-3 py-3"><StatusPill status={t.status} /></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</td>
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
      </CardContent>
    </Card>
  );
}