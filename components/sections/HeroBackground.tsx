"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Slow ambient drift for the hero's background glows — deliberately much
 * slower than lib/motion.ts's UI-transition durations (that scale exists
 * for discrete reveals/transitions, not continuous ambient motion, so it
 * isn't reused here). Only `x`/`y`/`scale` (transform) and the blobs'
 * static opacity are ever touched, so this stays fully GPU-compositable —
 * nothing here ever animates a layout-affecting property.
 */
const DRIFT = {
  ease: "easeInOut",
  repeat: Infinity,
  repeatType: "mirror",
} as const;

interface BlobConfig {
  /** Position/size — corners only, deliberately kept clear of the text column. Hidden on smaller breakpoints to cap effect cost on mobile. */
  className: string;
  animate: { x: [number, number]; y: [number, number]; scale: [number, number] };
  duration: number;
}

const BLOBS: BlobConfig[] = [
  {
    className: "-top-24 -left-24 size-80 bg-accent sm:size-96",
    animate: { x: [0, 30], y: [0, 24], scale: [1, 1.06] },
    duration: 18,
  },
  {
    className: "top-1/3 -right-20 hidden size-72 bg-glow-cyan sm:block",
    animate: { x: [0, -24], y: [0, 20], scale: [1, 1.08] },
    duration: 22,
  },
  {
    className: "-bottom-24 left-1/4 hidden size-64 bg-glow-warm lg:block",
    animate: { x: [0, 20], y: [0, -18], scale: [1, 1.05] },
    duration: 20,
  },
];

/**
 * Purely decorative (`aria-hidden`) ambient background for Hero — large,
 * heavily blurred, low-opacity color washes in the corners, never behind
 * the text column. `useInView` cancels the drift the moment the hero
 * scrolls out of the viewport (and doesn't restart it until it scrolls back
 * in) so nothing keeps animating off-screen; reduced motion is handled for
 * free by MotionProvider (components/motion/MotionProvider.tsx), which
 * collapses transform-based `motion.*` animation to an instant/static
 * equivalent app-wide.
 */
export function HeroBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.1 });

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {BLOBS.map((blob, index) => (
        <motion.div
          key={index}
          className={cn("absolute rounded-full opacity-25 blur-3xl", blob.className)}
          animate={isInView ? blob.animate : undefined}
          transition={{ ...DRIFT, duration: blob.duration }}
        />
      ))}
    </div>
  );
}
