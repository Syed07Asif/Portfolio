"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { resolveActiveNavItem } from "./adminNav";
import { signOut } from "@/app/admin/(protected)/actions";

export interface AdminHeaderProps {
  adminEmail: string | null;
  onOpenMobile: () => void;
}

/**
 * Section title + breadcrumbs both derive from the same ADMIN_NAV_ITEMS
 * lookup the sidebar uses for active-route highlighting — one source of
 * truth for "what page is this," not a second hardcoded title map that
 * could drift from the nav.
 */
export function AdminHeader({ adminEmail, onOpenMobile }: AdminHeaderProps) {
  const pathname = usePathname();
  const activeItem = resolveActiveNavItem(pathname);
  const isDashboard = pathname === "/admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open menu"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-raised hover:text-foreground md:hidden"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {!isDashboard ? (
          <nav aria-label="Breadcrumb" className="text-caption text-foreground-muted">
            <Link href="/admin" className="hover:text-foreground">
              Admin
            </Link>
            {activeItem ? <span> / {activeItem.label}</span> : null}
          </nav>
        ) : null}
        <h1 className="truncate font-display text-body-lg font-semibold text-foreground">
          {activeItem?.label ?? "Admin"}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/" target="_blank" rel="noreferrer noopener">
            <ExternalLink aria-hidden="true" />
            <span className="hidden sm:inline">View public site</span>
          </a>
        </Button>

        {adminEmail ? <span className="hidden text-caption text-foreground-muted lg:inline">{adminEmail}</span> : null}

        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
