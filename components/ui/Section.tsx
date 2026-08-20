import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
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
 * built-in scroll-reveal so individual sections never wire up their own
 * viewport-triggered animation. `scroll-mt-(--header-height)` offsets
 * hash/anchor scrolling by the fixed Navbar's height so a `#section` link
 * doesn't land underneath it.
 *
 * **This is a Server Component** (Phase 24). It used to be `"use client"`
 * purely to run Framer Motion's `fadeInUp` + `revealOnScroll`, which meant
 * every section on the homepage — none of which are interactive — was
 * dragged into hydration. The reveal is now the `.reveal` class in
 * styles/globals.css, a CSS scroll-driven animation with identical intent
 * and no JS at all. See that file's comment for the measurements that
 * motivated the change and how reduced-motion/unsupported browsers are
 * handled.
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
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("reveal scroll-mt-(--header-height)", spacingClassName[spacing], className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
