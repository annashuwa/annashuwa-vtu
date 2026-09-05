"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { NETWORK_CODES } from "@/lib/constants";

type DataPlan = {
  id: string;
  network: string;
  planName: string;
  size: string;
  validity: string;
  price: string;
  oldPrice: string | null;
  kind: string;
  isActive: boolean;
};

type Provider = {
  id: string;
  category: string;
  name: string;
  code: string;
  description: string | null;
  fee: string;
  isActive: boolean;
  packages: { id: string; name: string; price: string; duration: string | null; isActive: boolean }[];
};

type ExamPin = {
  id: string;
  name: string;
  category: string;
  price: string;
  costPrice: string | null;
  description: string | null;
  isActive: boolean;
  soldCount: number;
};

export default function AdminServicesPage() {
  return (
    <Tabs defaultValue="data-plans">
      <TabsList>
        <TabsTrigger value="data-plans">Data plans</TabsTrigger>
        <TabsTrigger value="providers">Electricity & Cable</TabsTrigger>
        <TabsTrigger value="exam-pins">Exam PINs</TabsTrigger>
      </TabsList>
      <TabsContent value="data-plans">
        <DataPlansTab />
      </TabsContent>
      <TabsContent value="providers">
        <ProvidersTab />
      </TabsContent>
      <TabsContent value="exam-pins">
        <ExamPinsTab />
      </TabsContent>
    </Tabs>
  );
}

/* ------------------------------ Data plans ------------------------------ */

function DataPlansTab() {
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [network, setNetwork] = useState("MTN");
  const [planName, setPlanName] = useState("");
  const [size, setSize] = useState("");
  const [validity, setValidity] = useState("");
  const [price, setPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ plans: DataPlan[] }>("/api/admin/services/data-plans");
    if (res.error) toast.error(res.error);
    else setPlans(res.data!.plans);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(plan: DataPlan) {
    setBusyId(plan.id);
    const res = await apiFetch(`/api/admin/services/data-plans/${plan.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    setBusyId(null);
    if (res.error) return toast.error(res.error);
    toast.success("Plan updated");
    load();
  }

  async function remove(plan: DataPlan) {
    setBusyId(plan.id);
    const res = await apiFetch(`/api/admin/services/data-plans/${plan.id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.error) return toast.error(res.error);
    toast.success("Plan deleted");
    load();
  }

  async function create() {
    if (!planName || !size || !validity || !price) return toast.error("All fields are required");
    setCreating(true);
    const res = await apiFetch("/api/admin/services/data-plans", {
      method: "POST",
      body: JSON.stringify({ network, planName, size, validity, price: Number(price), kind: "DATA" }),
    });
    setCreating(false);
    if (res.error) return toast.error(res.error);
    toast.success("Plan created");
    setPlanName(""); setSize(""); setValidity(""); setPrice("");
    load();
  }

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>Data plans</CardTitle>
        <CardDescription>Add and manage data plans per network.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1 sm:col-span-1">
            <Label>Network</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NETWORK_CODES.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Plan name</Label>
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Daily 500MB" />
          </div>
          <div className="space-y-1">
            <Label>Size</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="500MB" />
          </div>
          <div className="space-y-1">
            <Label>Validity</Label>
            <Input value={validity} onChange={(e) => setValidity(e.target.value)} placeholder="2 days" />
          </div>
          <div className="space-y-1">
            <Label>Price</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="350" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" variant="emerald" onClick={create} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Network</th>
                  <th className="px-3 py-2.5">Plan</th>
                  <th className="px-3 py-2.5">Size</th>
                  <th className="px-3 py-2.5">Validity</th>
                  <th className="px-3 py-2.5">Price</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-3 font-semibold">{p.network}</td>
                    <td className="px-3 py-3">{p.planName}</td>
                    <td className="px-3 py-3">{p.size}</td>
                    <td className="px-3 py-3">{p.validity}</td>
                    <td className="px-3 py-3 font-semibold">{formatNaira(p.price)}</td>
                    <td className="px-3 py-3">
                      <Badge variant={p.isActive ? "success" : "muted"}>{p.isActive ? "Active" : "Hidden"}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => toggle(p)} title={p.isActive ? "Deactivate" : "Activate"}>
                          <Power className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" disabled={busyId === p.id} onClick={() => remove(p)}>
                          <Trash2 className="size-3.5" />
                        </Button>
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
  );
}

/* ------------------------------ Providers ------------------------------ */

function ProvidersTab() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ providers: Provider[] }>("/api/admin/services");
    if (res.error) toast.error(res.error);
    else setProviders(res.data!.providers);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(p: Provider) {
    setBusyId(p.id);
    const res = await apiFetch(`/api/admin/services/providers/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    setBusyId(null);
    if (res.error) return toast.error(res.error);
    toast.success("Provider updated");
    load();
  }

  async function remove(p: Provider) {
    setBusyId(p.id);
    const res = await apiFetch(`/api/admin/services/providers/${p.id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.error) return toast.error(res.error);
    toast.success("Provider deleted");
    load();
  }

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>Electricity & Cable providers</CardTitle>
        <CardDescription>Providers, fees and package management.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={p.category === "ELECTRICITY" ? "warning" : "info"}>{p.category}</Badge>
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.code} · fee {formatNaira(p.fee)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.isActive ? "success" : "muted"}>{p.isActive ? "Active" : "Hidden"}</Badge>
                    <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => toggle(p)} title={p.isActive ? "Deactivate" : "Activate"}>
                      <Power className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busyId === p.id} onClick={() => remove(p)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {p.packages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.packages.map((pkg) => (
                      <Badge key={pkg.id} variant="muted">
                        {pkg.name} — {formatNaira(pkg.price)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Exam PINs ------------------------------ */

function ExamPinsTab() {
  const [products, setProducts] = useState<ExamPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("WAEC");
  const [price, setPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ products: ExamPin[] }>("/api/admin/services/exam-pins");
    if (res.error) toast.error(res.error);
    else setProducts(res.data!.products);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(p: ExamPin) {
    setBusyId(p.id);
    const res = await apiFetch("/api/admin/services/exam-pins", {
      method: "PATCH",
      body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
    });
    setBusyId(null);
    if (res.error) return toast.error(res.error);
    toast.success("Product updated");
    load();
  }

  async function remove(p: ExamPin) {
    setBusyId(p.id);
    const res = await apiFetch("/api/admin/services/exam-pins", {
      method: "DELETE",
      body: JSON.stringify({ id: p.id }),
    });
    setBusyId(null);
    if (res.error) return toast.error(res.error);
    toast.success("Product deleted");
    load();
  }

  async function create() {
    if (!name || !price) return toast.error("Name and price are required");
    setCreating(true);
    const res = await apiFetch("/api/admin/services/exam-pins", {
      method: "POST",
      body: JSON.stringify({ name, category, price: Number(price) }),
    });
    setCreating(false);
    if (res.error) return toast.error(res.error);
    toast.success("Product created");
    setName("");
    setPrice("");
    load();
  }

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>Exam PIN products</CardTitle>
        <CardDescription>WAEC, NECO, NABTEB and JAMB products.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-[130px_1fr_130px_auto]">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["WAEC", "NECO", "NABTEB", "JAMB"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WAEC 6 subjects" />
          </div>
          <div className="space-y-1">
            <Label>Price</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2500" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" variant="emerald" onClick={create} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Price</th>
                  <th className="px-3 py-2.5">Sold</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3"><Badge variant="muted">{p.category}</Badge></td>
                    <td className="px-3 py-3 font-semibold">{formatNaira(p.price)}</td>
                    <td className="px-3 py-3">{p.soldCount}</td>
                    <td className="px-3 py-3">
                      <Badge variant={p.isActive ? "success" : "muted"}>{p.isActive ? "Active" : "Hidden"}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => toggle(p)} title="Toggle">
                          <Power className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" disabled={busyId === p.id} onClick={() => remove(p)}>
                          <Trash2 className="size-3.5" />
                        </Button>
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
  );
}