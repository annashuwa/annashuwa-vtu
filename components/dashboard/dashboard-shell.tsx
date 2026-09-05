"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar, SidebarMobile, MobileMenuButton } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import type { UserProfile } from "@/types";

export function DashboardShell({
  user,
  balance,
  children,
}: {
  user: UserProfile;
  balance: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[290px] bg-sidebar p-0 ring-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarMobile user={user} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileMenuButtonDock onOpen={() => setMobileOpen(true)} />
        <Topbar balance={balance} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-border/70 px-6 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ANNASHUWA VTU. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

function MobileMenuButtonDock({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center border-b border-border/70 px-4 py-2 lg:hidden">
      <MobileMenuButton onClick={onOpen} />
    </div>
  );
}