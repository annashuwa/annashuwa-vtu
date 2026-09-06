"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Users, Loader2, ShieldOff, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api";
import { initials, formatNaira, formatDateTime } from "@/lib/utils";
import type { Paginated } from "@/types";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  walletBalance: string;
  transactionCount: number;
  createdAt: string;
  lastLoginAt: string | null;
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);
  const [adjustType, setAdjustType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, role, status]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (role !== "ALL") params.set("role", role);
    if (status !== "ALL") params.set("status", status);
    const res = await apiFetch<Paginated<AdminUser> & { users?: AdminUser[] }>(`/api/admin/users?${params.toString()}`);
    if (res.error) toast.error(res.error);
    else {
      // The API returns the list under `users` (contract A29); accept `items`
      // too so the table can never silently render empty on a key mismatch.
      const d = res.data!;
      setData({
        items: d.users ?? d.items ?? [],
        total: d.total ?? 0,
        page: d.page ?? page,
        pageSize: d.pageSize ?? 20,
        totalPages: d.totalPages ?? 1,
      });
    }
    setLoading(false);
  }, [page, debouncedSearch, role, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(user: AdminUser) {
    const next = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setBusyId(user.id);
    const res = await apiFetch<{ status: string }>(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    setBusyId(null);
    if (res.error) return toast.error(res.error);
    toast.success(next === "ACTIVE" ? "Account activated" : "Account suspended");
    load();
  }

  async function submitAdjust() {
    if (!adjustUser) return;
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (!adjustReason.trim()) return toast.error("Enter a reason");
    setAdjusting(true);
    const res = await apiFetch<{ newBalance: number }>(`/api/admin/users/${adjustUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({ walletAdjust: { amount, type: adjustType, reason: adjustReason } }),
    });
    setAdjusting(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Wallet ${adjustType === "CREDIT" ? "credited" : "debited"} by ${formatNaira(amount)}`);
    setAdjustUser(null);
    setAdjustAmount("");
    setAdjustReason("");
    load();
  }

  const users = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Card className="gap-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5 text-royal-600 dark:text-royal-400" /> Users
            </CardTitle>
            <CardDescription>Manage accounts and adjust wallets.</CardDescription>
          </div>
          <Badge variant="muted">{data?.total ?? 0} users</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5">Balance</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Txns</th>
                    <th className="px-3 py-2.5">Joined</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarImage src={u.id} alt="" />
                            <AvatarFallback>{initials(u.fullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{u.fullName}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold">{formatNaira(u.walletBalance)}</td>
                      <td className="px-3 py-3">
                        <Badge variant={u.role === "ADMIN" ? "info" : "muted"}>{u.role}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={u.status === "ACTIVE" ? "success" : "destructive"}>{u.status}</Badge>
                      </td>
                      <td className="px-3 py-3">{u.transactionCount}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {u.role !== "ADMIN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === u.id}
                              onClick={() => toggleStatus(u)}
                              title={u.status === "ACTIVE" ? "Suspend" : "Activate"}
                            >
                              {busyId === u.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : u.status === "ACTIVE" ? (
                                <ShieldOff className="size-3.5" />
                              ) : (
                                <ShieldCheck className="size-3.5" />
                              )}
                              {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setAdjustUser(u)} disabled={busyId === u.id}>
                            <Wallet className="size-3.5" /> Adjust
                          </Button>
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
                  Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages || loading}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!adjustUser} onOpenChange={(o) => !o && setAdjustUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust wallet</DialogTitle>
            <DialogDescription>
              {adjustUser ? `${adjustUser.fullName} — ${formatNaira(adjustUser.walletBalance)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["CREDIT", "DEBIT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAdjustType(t)}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold capitalize transition-all ${
                    adjustType === t
                      ? t === "CREDIT"
                        ? "border-emerald-600 bg-emerald-500/5"
                        : "border-destructive bg-destructive/5"
                      : "border-border/70 text-muted-foreground hover:border-border"
                  }`}
                >
                  {t.toLowerCase()}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-amount">Amount</Label>
              <Input
                id="adj-amount"
                type="number"
                min={1}
                placeholder="e.g. 5000"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">Reason</Label>
              <Input
                id="adj-reason"
                placeholder="e.g. refund, bonus, chargeback"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            <Button className="w-full" variant="emerald" onClick={submitAdjust} disabled={adjusting}>
              {adjusting ? <Loader2 className="size-4 animate-spin" /> : null}
              {adjusting ? "Adjusting..." : "Apply adjustment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}