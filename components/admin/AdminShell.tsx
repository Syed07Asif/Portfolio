"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

export interface AdminShellProps {
  adminEmail: string | null;
  blogEnabled: boolean;
  children: ReactNode;
}

/**
 * Owns the interactive shell state (collapsed/mobile-open) so the server
 * layout (app/admin/(protected)/layout.tsx) can stay a plain async auth
 * check + data fetch with no client state of its own — same server/client
 * split as Hero/HeroReveal or Navbar's own mobile-menu state. Focus trap +
 * body-scroll lock are driven from here, on the same ref AdminSidebar
 * attaches to its drawer panel, mirroring Navbar's mobile overlay.
 */
export function AdminShell({ adminEmail, blogEnabled, children }: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useFocusTrap(mobileNavRef, isMobileOpen);
  useLockBodyScroll(isMobileOpen);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        blogEnabled={blogEnabled}
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => setIsCollapsed((collapsed) => !collapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        mobileNavRef={mobileNavRef}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader adminEmail={adminEmail} onOpenMobile={() => setIsMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
