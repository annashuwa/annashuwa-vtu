"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ReceiptText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/dashboard/stats-cards";
import { EmptyState } from "@/components/shared/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { formatNaira, formatDateTime } from "@/lib/utils";
import type { Paginated, VtuTransaction } from "@/types";

const serviceOptions = [
  { value: "AIRTIME", label: "Airtime" },
  { value: "DATA", label: "Data" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "CABLE", label: "Cable" },
  { value: "EXAM_PIN", label: "Exam PIN" },
  { value: "WALLET_FUNDING", label: "Funding" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
];

const statusOptions = ["SUCCESSFUL", "PENDING", "PROCESSING",
"FAILED", "REFUNDED", "REVERSED", "PARTIAL_REFUND"];

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [serviceType, setServiceType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [data, setData] = useState<Paginated<VtuTransaction> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, serviceType, status]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (serviceType !== "all") params.set("serviceType", serviceType);
    if (status !== "all") params.set("status", status);

    const res = await apiFetch<Paginated<VtuTransaction>>(`/api/transactions?${params.toString()}`);
    if (res.error) {
      toast.error(res.error);
    } else {
      setData(res.data!);
    }
    setLoading(false);
  }, [page, pageSize, debouncedSearch, serviceType, status]);

  useEffect(() => {
    load();
  }, [load]);

  const txns = data?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="gap-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="size-5 text-royal-600 dark:text-royal-400" /> Transactions
            </CardTitle>
            <CardDescription>Search and filter your transaction history.</CardDescription>
          </div>
          <Badge variant="muted">{data?.total ?? 0} total</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_140px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by reference or provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
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
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
              ))}
            </div>
          ) : txns.length === 0 ? (
            <div className="py-6">
              <EmptyState title="No transactions found" description="Try adjusting your filters." />
            </div>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
              {txns.map((t) => (
                <li key={t.id}>
                  <a
                    href={`/receipt/${t.reference}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-royal-500/10 text-royal-700 dark:text-royal-400">
                        <ReceiptText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{t.provider}</span>
                          <Badge variant="muted">{t.serviceType.replace(/_/g, " ").toLowerCase()}</Badge>
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {t.reference} · {formatDateTime(t.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold">{formatNaira(t.amount)}</div>
                      <StatusPill status={t.status} />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages || loading}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}