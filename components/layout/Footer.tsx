"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, Download } from "lucide-react";
import { Container, Divider, IconButton } from "@/components/ui";
import { resolveAnchorHref } from "@/lib/utils";
import { isExternalContactHref, resolveContactHref, resolveContactIcon } from "@/lib/contactLinks";
import { RESUME_ROUTE } from "@/lib/constants";
import type { ContactLink, NavItem } from "@/types/content";

export interface FooterProps {
  /** Same resolved list (site_settings.primary_nav, fallback already applied) the Navbar uses. */
  navItems: NavItem[];
  /** Rows already filtered to `published = true` by getContactLinks() — only channels that exist render. */
  contactLinks: ContactLink[];
  wordmark: string;
  /** Brief identity line — profile.tagline/headline, resolved by the caller. Omitted entirely if there's nothing to show. */
  identityLine?: string | null;
  /** Whether an active resume exists — gates the Download Resume icon, same as Hero's and Contact's own gate on the same fact. */
  hasResume: boolean;
}

/**
 * Site footer: identity line, the same nav links as the Navbar (anchors
 * resolved the same way so they still work off the homepage), contact
 * channels loaded from contact_links, the current year, and a back-to-top
 * control that relies on native hash scrolling (smooth, reduced-motion aware
 * — see styles/globals.css) rather than a JS scroll call.
 */
export function Footer({ navItems, contactLinks, wordmark, identityLine, hasResume }: FooterProps) {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col gap-10 py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-sm flex-col gap-2">
            <p className="font-display text-h4 font-bold text-foreground">{wordmark}</p>
            {identityLine ? <p className="text-body text-foreground-secondary">{identityLine}</p> : null}
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={resolveAnchorHref(item.href, pathname)}
                className="text-small font-medium text-foreground-secondary transition-colors duration-fast ease-out-quart hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {contactLinks.length > 0 || hasResume ? (
            <div className="flex gap-3">
              {contactLinks.map((link) => {
                const href = resolveContactHref(link);
                if (!href) return null;
                const Icon = resolveContactIcon(link.type);
                const isExternal = isExternalContactHref(href);

                return (
                  <IconButton
                    key={link.id}
                    asChild
                    variant="secondary"
                    size="sm"
                    icon={Icon}
                    aria-label={link.label}
                  >
                    <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer noopener" : undefined} />
                  </IconButton>
                );
              })}
              {hasResume ? (
                <IconButton asChild variant="secondary" size="sm" icon={Download} aria-label="Download Resume">
                  <a href={RESUME_ROUTE} />
                </IconButton>
              ) : null}
            </div>
          ) : null}
        </div>

        <Divider />

        <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:justify-between">
          <p className="text-caption text-foreground-muted">
            &copy; {year} {wordmark}. All rights reserved.
          </p>
          <IconButton asChild variant="ghost" size="sm" icon={ArrowUp} aria-label="Back to top">
            <a href="#main" />
          </IconButton>
        </div>
      </Container>
    </footer>
  );
}
