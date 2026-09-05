import { getSessionUser, getSessionToken, API_URL } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { formatDateTime } from "@/lib/utils";
import { Mail, Phone, UserRound, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) return null;

  const token = await getSessionToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/transactions?pageSize=1`, {
    headers,
    cache: "no-store",
  });
  const txnData = res.ok ? ((await res.json()) as { total?: number }) : { total: 0 };
  const txnCount = txnData.total ?? 0;
  const initials = user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="text-base">Profile information</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 bg-gradient-to-br from-royal-600 to-navy-900">
              <AvatarFallback className="text-lg text-white">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{user.fullName}</span>
                <Badge variant={user.role === "ADMIN" ? "info" : "muted"}>{user.role}</Badge>
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> {user.email}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> {user.phone}</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="size-4" /> {user.emailVerified ? "Email verified" : "Email not verified"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="size-4" /> {txnCount} transactions
            </div>
            <div className="col-span-full text-xs text-muted-foreground">
              Member since {formatDateTime(user.createdAt)}
            </div>
          </div>
          <ProfileForm user={{ fullName: user.fullName, phone: user.phone }} />
        </CardContent>
      </Card>
      <ChangePasswordForm />
    </div>
  );
}