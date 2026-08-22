"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Mounted once in app/layout.tsx, wrapping the whole app. `reducedMotion="user"`
 * makes every `motion.*` component (including every variant in lib/motion.ts)
 * automatically respect `prefers-reduced-motion`: transform-based animation
 * (movement, scale, rotation) collapses to an instant/opacity-only
 * equivalent, with no per-section handling required — sections just use the
 * variants normally.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
