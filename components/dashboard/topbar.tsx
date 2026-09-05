"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Wallet, MailOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { formatDateTime } from "@/lib/utils";
import type { NotificationItem } from "@/types";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/airtime": "Buy Airtime",
  "/airtime-cash": "Airtime to Cash",
  "/data": "Buy Data",
  "/electricity": "Pay Electricity",
  "/cable": "Cable TV Subscription",
  "/exam-pins": "Exam PINs",
  "/wallet": "Wallet & Funding",
  "/transactions": "Transaction History",
  "/profile": "My Profile",
};

export function Topbar({ balance }: { balance: number }) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => d?.data && setNotifications(d.data))
        .catch(() => {});
    }
  }, [open]);

  async function markRead() {
    await fetch("/api/notifications/read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read");
  }

  const title = titleMap[pathname] ?? "ANNASHUWA VTU";
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex-1">
        <h1 className="text-lg font-bold tracking-tight lg:text-xl">{title}</h1>
      </div>

      <Link
        href="/wallet"
        className="hidden items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 sm:flex"
      >
        <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
        <div className="leading-none">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Balance</div>
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </Link>

      <DropdownMenu onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuLabel className="px-0 py-0">Notifications</DropdownMenuLabel>
            <button
              onClick={markRead}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <MailOpen className="size-3.5" /> Mark all read
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-96 overflow-y-auto p-1">
            {notifications.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col gap-0.5 rounded-lg px-2 py-2.5 ${n.isRead ? "" : "bg-muted/60"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    {!n.isRead && <span className="size-1.5 rounded-full bg-gold-500" />}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  <span className="mt-0.5 text-[10px] text-muted-foreground/70">{formatDateTime(n.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />
    </header>
  );
}