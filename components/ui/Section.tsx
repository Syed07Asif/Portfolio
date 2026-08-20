"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fadeInUp, revealOnScroll } from "@/lib/motion";
import { Container } from "./Container";

export type SectionSpacing = "default" | "lg";

const spacingClassName: Record<SectionSpacing, string> = {
  default: "py-(--space-section-y)",
  lg: "py-(--space-section-y-lg)",
};

export interface SectionProps {
  /** Anchor id nav links point to, e.g. `href="#projects"`. */
  id: string;
  /**
   * Id of the heading that names this section — normally the matching
   * `SectionHeading`'s own `headingId`. An unnamed `<section>` is an
   * anonymous region in a screen reader's landmark list; naming it is what
   * makes "Projects" appear there instead of "region".
   */
  labelledBy?: string;
  spacing?: SectionSpacing;
  className?: string;
  /** Passed through to the inner Container. */
  containerClassName?: string;
  children?: ReactNode;
}

/**
 * The outer wrapper every top-level page section uses: consistent vertical
 * rhythm, the shared max-width via Container, a nav-anchor id, and a
 * built-in scroll-reveal (fadeInUp + revealOnScroll from lib/motion) so
 * individual sections never wire up their own viewport-triggered animation.
 * `scroll-mt-(--header-height)` offsets hash/anchor scrolling by the fixed
 * Navbar's height so a `#section` link doesn't land underneath it.
 */
export function Section({
  id,
  labelledBy,
  spacing = "default",
  className,
  containerClassName,
  children,
}: SectionProps) {
  return (
    <motion.section
      id={id}
      aria-labelledby={labelledBy}
      variants={fadeInUp}
      {...revealOnScroll}
      className={cn("scroll-mt-(--header-height)", spacingClassName[spacing], className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </motion.section>
  );
}
