"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Smartphone,
  Wifi,
  Lightbulb,
  Tv,
  GraduationCap,
  Wallet,
  ReceiptText,
  User,
  ChevronsUpDown,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/shared/logo";
import type { UserProfile } from "@/types";

export const dashboardNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/airtime", label: "Buy Airtime", icon: Smartphone },
  { href: "/airtime-cash", label: "Airtime to Cash", icon: ArrowLeftRight },
  { href: "/data", label: "Buy Data", icon: Wifi },
  { href: "/electricity", label: "Electricity", icon: Lightbulb },
  { href: "/cable", label: "Cable TV", icon: Tv },
  { href: "/exam-pins", label: "Exam PINs", icon: GraduationCap },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {dashboardNav.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-royal-700/30 text-gold-300 ring-1 ring-inset ring-gold-400/20"
                : "text-sidebar-muted hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon className={cn("size-4.5", active ? "text-gold-400" : "")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ user, onNavigate }: { user: UserProfile; onNavigate?: () => void }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <div className="border-t border-white/10 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5">
            <Avatar className="size-8 bg-royal-500/30">
              <AvatarFallback className="text-xs text-gold-300">
                {user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user.fullName}</div>
              <div className="truncate text-xs text-sidebar-muted">{user.email}</div>
            </div>
            <ChevronsUpDown className="size-4 text-sidebar-muted" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild onClick={onNavigate}>
            <Link href="/profile">
              <User className="size-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild onClick={onNavigate}>
            <Link href="/transactions">
              <ReceiptText className="size-4" /> Transactions
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Sidebar({ user }: { user: UserProfile }) {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-white/10 bg-sidebar lg:flex lg:sticky lg:top-0">
      <div className="px-5 py-5">
        <Link href="/dashboard">
          <Logo className="[&_*]:text-white [&_.text-gradient-royal]:text-gold-400" size="sm" />
        </Link>
      </div>
      <NavItems />
      <UserFooter user={user} />
    </aside>
  );
}

export function SidebarMobile({ user }: { user: UserProfile }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-5 py-5">
        <Logo className="[&_*]:text-white [&_.text-gradient-royal]:text-gold-400" size="sm" />
      </div>
      <NavItems onNavigate={undefined} />
      <UserFooter user={user} />
    </div>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="lg:hidden" aria-label="Open menu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    </Button>
  );
}