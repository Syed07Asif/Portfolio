"use client";

import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { revealOnScroll, staggerContainer, staggerItem } from "@/lib/motion";
import { isExternalContactHref, resolveContactHref, resolveContactIcon } from "@/lib/contactLinks";
import { RESUME_ROUTE } from "@/lib/constants";
import type { ContactLink } from "@/types/content";

export interface ContactContentProps {
  contactLinks: ContactLink[];
  /** Whether an active resume exists — the Download Resume CTA renders only when true, same gate every other resume CTA on the site uses. */
  hasResume: boolean;
}

/**
 * Each channel is a whole-card link (Card's `interactive href` mode, same
 * pattern ProjectCard uses) rather than icon-only like Footer's compact
 * row — this is the site's primary contact destination, so the label and
 * raw value (email address, phone number, handle) are both visible, not
 * just an icon. The copy-email control is deliberately its own standalone
 * button below the grid rather than nested inside the email card itself:
 * nesting a second interactive control inside an already-whole-card <a>
 * would create two focusable targets with an unclear boundary between
 * them, the same trap Card's own doc comment warns about.
 */
export function ContactContent({ contactLinks, hasResume }: ContactContentProps) {
  const emailLink = contactLinks.find((link) => link.type === "email") ?? null;
  const hasClosingActions = Boolean(emailLink) || hasResume;

  return (
    <div className="flex flex-col gap-10">
      {contactLinks.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          {...revealOnScroll}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {contactLinks.map((link) => {
            const href = resolveContactHref(link);
            if (!href) return null;

            const Icon = resolveContactIcon(link.type);
            const external = isExternalContactHref(href);

            return (
              <motion.div key={link.id} variants={staggerItem}>
                <Card
                  interactive
                  href={href}
                  hover="lift"
                  padding="lg"
                  aria-label={`${link.label}: ${link.value}`}
                  className="flex h-full items-center gap-4"
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer noopener" : undefined}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-accent">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body font-semibold text-foreground">{link.label}</span>
                    <span className="truncate text-small text-foreground-muted">{link.value}</span>
                  </span>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : null}

      {hasClosingActions ? (
        <div className="flex flex-wrap items-center gap-4">
          {emailLink ? <CopyEmailButton email={emailLink.value} /> : null}
          {hasResume ? (
            <Button asChild variant="outline" size="lg" leadingIcon={Download}>
              <a href={RESUME_ROUTE}>Download Resume</a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically — please select and copy the address manually.");
    }
  }

  return (
    <Button variant="secondary" size="lg" leadingIcon={copied ? Check : Copy} onClick={handleCopy}>
      {copied ? "Copied" : "Copy email address"}
    </Button>
  );
}
