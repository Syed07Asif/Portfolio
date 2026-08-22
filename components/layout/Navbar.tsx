"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Container, IconButton } from "@/components/ui";
import { cn, resolveAnchorHref } from "@/lib/utils";
import { fadeIn } from "@/lib/motion";
import { NAV_CTA } from "@/lib/constants";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import type { NavItem } from "@/types/content";

export interface NavbarProps {
  /** From site_settings.primary_nav (server-resolved fallback to DEFAULT_NAV_ITEMS already applied by the caller). */
  navItems: NavItem[];
  /** From profile.full_name (server-resolved fallback to DEFAULT_WORDMARK already applied by the caller). */
  wordmark: string;
}

/**
 * Fixed site header: transparent over the hero, elevated once scrolled.
 * Nav items are entirely data-driven — adding a section is a `primary_nav`
 * row, never a change here. On the homepage, anchors scroll-spy and
 * smooth-scroll (native `scroll-behavior` + each Section's
 * `scroll-mt-(--header-height)`, see components/ui/Section.tsx); off the
 * homepage the same hrefs are prefixed with `/` so they navigate back to
 * the right section instead of doing nothing.
 */
export function Navbar({ navItems, wordmark }: NavbarProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on route change (e.g. browser back/forward).
  // Adjusting state during render (not in an effect) per React's guidance
  // for "resetting state when a prop changes" — avoids an extra render pass.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const sectionIds = useMemo(
    () => navItems.filter((item) => item.href.startsWith("#")).map((item) => item.href.slice(1)),
    [navItems],
  );
  const activeId = useActiveSection(sectionIds);

  useFocusTrap(mobileNavRef, mobileOpen);
  useLockBodyScroll(mobileOpen);

  // Elevate the header background once the page has scrolled past the top.
  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function resolveHref(href: string) {
    return resolveAnchorHref(href, pathname);
  }

  function isActiveItem(href: string) {
    return isHome && href.startsWith("#") && activeId === href.slice(1);
  }

  const isElevated = isScrolled || mobileOpen;

  return (
    <>
      <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-base ease-out-quart",
        isElevated
          ? "border-border bg-background/85 shadow-sm backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-(--header-height) items-center justify-between">
        <Link
          href="/"
          className="font-display text-h4 font-bold tracking-tight text-foreground transition-colors duration-fast ease-out-quart hover:text-accent"
        >
          {wordmark}
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={resolveHref(item.href)}
              className={cn(
                "text-body font-medium transition-colors duration-fast ease-out-quart",
                isActiveItem(item.href)
                  ? "text-accent"
                  : "text-foreground-secondary hover:text-foreground",
              )}
              aria-current={isActiveItem(item.href) ? "true" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild size="sm">
            <Link href={resolveHref(NAV_CTA.href)}>{NAV_CTA.label}</Link>
          </Button>
        </div>

        <IconButton
          icon={mobileOpen ? X : Menu}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          variant="ghost"
          className="md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
        />
        </Container>
      </motion.header>

      {/*
        Rendered as a SIBLING of <header>, not inside it.

        This overlay is `position: fixed` with `top: var(--header-height);
        bottom: 0`, which should make it fill everything below the header.
        Nested inside the header it did not: opening the menu sets
        `isElevated`, which adds `backdrop-blur-md` to the header, and
        `backdrop-filter` makes an element a *containing block* for fixed-
        position descendants. The overlay then resolved its offsets against
        the 81px header instead of the viewport and computed to **height 0**.

        Phase 24 found this by measurement and confirmed the cause directly:
        forcing the header's `backdrop-filter` to `none` in the live page took
        the overlay from 0px to 764px. It is easy to miss by eye because the
        links still paint — they overflow the zero-height box — but they were
        laid out from y=63 downward, i.e. the first one sat *underneath* the
        fixed header and could not be tapped, and the dimmed backdrop covered
        nothing at all.
      */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-nav"
            id="mobile-nav"
            ref={mobileNavRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-x-0 top-(--header-height) bottom-0 z-30 overflow-y-auto bg-background/95 backdrop-blur-md md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <nav
              aria-label="Mobile"
              className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-12"
              onClick={(event) => event.stopPropagation()}
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={resolveHref(item.href)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "text-h3 font-display font-semibold transition-colors duration-fast ease-out-quart",
                    isActiveItem(item.href) ? "text-accent" : "text-foreground hover:text-accent",
                  )}
                  aria-current={isActiveItem(item.href) ? "true" : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild size="lg" className="mt-4" onClick={() => setMobileOpen(false)}>
                <Link href={resolveHref(NAV_CTA.href)}>{NAV_CTA.label}</Link>
              </Button>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
