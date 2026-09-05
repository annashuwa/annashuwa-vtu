"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Wrench,
  LogOut,
  ShieldCheck,
  Home,
  ArrowLeftRight,
  ServerCog,
  History,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/admin/airtime-cash", label: "Airtime Cash", icon: ArrowLeftRight },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/providers", label: "Providers", icon: ServerCog },
  { href: "/admin/jobs", label: "Jobs", icon: History },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/70 bg-muted/20 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border/70 px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <div className="text-sm font-bold leading-none">{APP_NAME}</div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Admin panel
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-border/70 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <Home className="size-4" /> User portal
          </Link>
          <form action="/api/auth/logout" method="POST">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <LogOut className="size-4" /> Log out
            </Button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/70 bg-card/90 px-4 backdrop-blur lg:pl-[260px] lg:pr-8">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary lg:hidden">
            <ShieldCheck className="size-4" />
          </div>
          <h1 className="font-bold">
            {navItems.find((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)))?.label ?? "Admin"}
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 lg:pl-[260px] lg:pr-8">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}