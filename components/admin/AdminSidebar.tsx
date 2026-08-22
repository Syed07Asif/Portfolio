"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS, resolveActiveNavItem } from "./adminNav";

export interface AdminSidebarProps {
  blogEnabled: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  mobileNavRef: RefObject<HTMLDivElement | null>;
}

function NavList({
  blogEnabled,
  activeHref,
  collapsed,
  onNavigate,
}: {
  blogEnabled: boolean;
  activeHref: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeHref === item.href;
        const isDisabled = Boolean(item.requiresBlogEnabled) && !blogEnabled;

        if (isDisabled) {
          return (
            <li key={item.href}>
              <span
                aria-disabled="true"
                title="Enable the blog in Settings to use this section"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-small text-foreground-muted opacity-50"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </span>
            </li>
          );
        }

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-small font-medium transition-colors duration-fast ease-out-quart",
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-foreground-secondary hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Two independent renderings of the same nav list, same split Navbar's
 * mobile-menu-vs-desktop-nav already uses: a persistent, collapsible
 * column at `md:` and up (the brief's "collapsible sidebar on tablet"),
 * and a focus-trapped overlay drawer below `md:` (the brief's "drawer on
 * mobile"). `mobileNavRef`/`isMobileOpen` are owned by AdminShell, which
 * also drives `useFocusTrap`/`useLockBodyScroll` on this same ref — same
 * split as Navbar's own mobile overlay.
 */
export function AdminSidebar({
  blogEnabled,
  isCollapsed,
  onToggleCollapsed,
  isMobileOpen,
  onCloseMobile,
  mobileNavRef,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const activeHref = resolveActiveNavItem(pathname)?.href ?? null;

  return (
    <>
      {/* Tablet / desktop: persistent, collapsible column. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-base ease-out-quart md:flex",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!isCollapsed ? (
            <span className="truncate font-display text-body font-semibold text-foreground">Admin</span>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors duration-fast ease-out-quart hover:bg-surface-raised hover:text-foreground"
          >
            {isCollapsed ? (
              <ChevronRight className="size-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
          <NavList blogEnabled={blogEnabled} activeHref={activeHref} collapsed={isCollapsed} />
        </nav>
      </aside>

      {/* Mobile: overlay drawer. */}
      <AnimatePresence>
        {isMobileOpen ? (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.div
              key="drawer"
              ref={mobileNavRef}
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <span className="font-display text-body font-semibold text-foreground">Admin</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Close menu"
                  className="flex size-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
                <NavList blogEnabled={blogEnabled} activeHref={activeHref} collapsed={false} onNavigate={onCloseMobile} />
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
