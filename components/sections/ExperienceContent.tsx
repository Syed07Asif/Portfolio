"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { fadeInUp, revealOnScroll } from "@/lib/motion";
import { ExperienceItem } from "./ExperienceItem";
import type { Experience } from "@/types/content";

/**
 * The connecting rail: a dot plus a downward line to the *next* item only —
 * never an upward one. Each `<li>` owns just the segment below its own dot,
 * so the first item naturally has nothing above it and the last has
 * nothing below, without special-casing either end beyond skipping the
 * line on the last item. The line is a flex sibling of the card (not
 * absolutely positioned), so it stretches to match however tall that
 * card's content turns out to be — a 400-word description and a 2-line one
 * both get a correctly-sized connector for free, no measurement needed.
 */
function Rail({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex w-10 shrink-0 flex-col items-center">
      <span className="mt-2 size-3 shrink-0 rounded-full border-2 border-accent bg-background" aria-hidden="true" />
      {!isLast ? <span className="w-px flex-1 bg-border" aria-hidden="true" /> : null}
    </div>
  );
}

export interface ExperienceContentProps {
  entries: Experience[];
}

/**
 * Descriptions render at full length uniformly (no clamp/expand) — the
 * rail above already handles arbitrary card height gracefully via natural
 * flex sizing, so there's no layout reason to truncate, and skipping
 * clamp/expand avoids needing interactive state that two DOM copies of the
 * same entry (mobile vs desktop wrapper, below) would have to keep in
 * sync.
 *
 * Each entry reveals independently via `fadeInUp` + `revealOnScroll`
 * (not a shared `staggerContainer`) — with up to a dozen entries spanning
 * well past one screen, a single parent-triggered stagger would fire the
 * whole list at once as soon as the container's top edge appeared, instead
 * of each entry animating in as the reader actually scrolls to it.
 */
export function ExperienceContent({ entries }: ExperienceContentProps) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;

        return (
          <motion.li key={entry.id} variants={fadeInUp} {...revealOnScroll} className="relative">
            {/* Mobile / tablet: rail on the left, single column. */}
            <div className="flex gap-4 md:hidden">
              <Rail isLast={isLast} />
              <div className={cn("min-w-0 flex-1", !isLast && "pb-10")}>
                <ExperienceItem entry={entry} />
              </div>
            </div>

            {/* Desktop: alternates left/right around a centered rail. */}
            <div className="hidden md:flex">
              <div className={cn("min-w-0 flex-1", !isLast && "pb-12")}>
                {index % 2 === 0 ? (
                  <div className="ml-auto max-w-lg pr-10">
                    <ExperienceItem entry={entry} />
                  </div>
                ) : null}
              </div>
              <Rail isLast={isLast} />
              <div className={cn("min-w-0 flex-1", !isLast && "pb-12")}>
                {index % 2 === 1 ? (
                  <div className="max-w-lg pl-10">
                    <ExperienceItem entry={entry} />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
