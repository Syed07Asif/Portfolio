"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Download, Send } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { RESUME_ROUTE, SECTION_IDS } from "@/lib/constants";

export interface HeroRevealProps {
  name: string;
  headline?: string | null;
  tagline?: string | null;
  shortBio?: string | null;
  availability?: string | null;
  /** Whether an active resume exists — the Download Resume CTA renders only when true, and always points at the stable RESUME_ROUTE, never a resume row's own file_url directly. */
  hasResume?: boolean;
}

/**
 * The hero's animated text/CTA stack — a small client child of the server
 * `Hero` component (see Hero.tsx), receiving already-resolved plain values
 * so the server component stays the one doing the actual data fetch. Every
 * piece below `name` is optional and simply omitted when unset (profile.tsx
 * requirement: a mostly-empty profile row still has to look deliberate, not
 * broken) — the stagger sequence just has fewer steps, no empty gaps.
 *
 * staggerContainer/staggerItem (lib/motion.ts) time this at ~0.3s duration
 * + 0.08s stagger per item, ~0.04s initial delay — with at most 7 items
 * here that's under 0.8s end-to-end, comfortably inside the ~1.2s budget.
 */
export function HeroReveal({ name, headline, tagline, shortBio, availability, hasResume }: HeroRevealProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex max-w-2xl flex-col gap-3 py-8 sm:gap-5 sm:py-20 lg:py-0"
    >
      <motion.p
        variants={staggerItem}
        className="text-caption font-medium uppercase tracking-wider text-accent"
      >
        Hello, I&apos;m
      </motion.p>

      <motion.h1
        variants={staggerItem}
        className="text-h1 font-display font-extrabold tracking-tight text-foreground sm:text-display"
      >
        {name}
      </motion.h1>

      {headline ? (
        <motion.p
          variants={staggerItem}
          className="text-h4 font-display font-semibold text-foreground-secondary sm:text-h3"
        >
          {headline}
        </motion.p>
      ) : null}

      {availability ? (
        <motion.div variants={staggerItem}>
          <Badge variant="success">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-success motion-safe:animate-pulse" />
            {availability}
          </Badge>
        </motion.div>
      ) : null}

      {tagline ? (
        <motion.p variants={staggerItem} className="text-body-lg text-foreground-secondary">
          {tagline}
        </motion.p>
      ) : null}

      {shortBio ? (
        <motion.p variants={staggerItem} className="text-body text-foreground-muted">
          {shortBio}
        </motion.p>
      ) : null}

      <motion.div variants={staggerItem} className="mt-2 flex flex-wrap items-center gap-4">
        <Button asChild size="lg" trailingIcon={ArrowRight}>
          <Link href={`#${SECTION_IDS.projects}`}>View Projects</Link>
        </Button>
        {hasResume ? (
          <Button asChild variant="secondary" size="lg" leadingIcon={Download}>
            <a href={RESUME_ROUTE}>Download Resume</a>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="lg" leadingIcon={Send}>
          <Link href={`#${SECTION_IDS.contact}`}>Contact Me</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
