import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const balance = Number(user.wallet?.balance ?? 0);

  return <DashboardShell user={user} balance={balance}>{children}</DashboardShell>;
}