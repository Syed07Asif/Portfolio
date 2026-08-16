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
 */
export function Section({
  id,
  spacing = "default",
  className,
  containerClassName,
  children,
}: SectionProps) {
  return (
    <motion.section
      id={id}
      variants={fadeInUp}
      {...revealOnScroll}
      className={cn(spacingClassName[spacing], className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </motion.section>
  );
}
