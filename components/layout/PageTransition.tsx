"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { pageTransition } from "@/lib/motion";

/**
 * Wraps route content (mounted in app/layout.tsx around `{children}`, inside
 * `<main>` — Navbar/Footer stay outside it, unanimated) so navigating
 * between the homepage and a project page fades/shifts instead of jumping.
 * No `mode="wait"`: the default sync mode overlaps the outgoing and
 * incoming pages so the total transition stays under pageTransition's own
 * ~300ms enter duration rather than the ~450ms a sequential wait would add
 * up to. Reduced motion is handled automatically by MotionProvider — no
 * per-transition check needed here.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence initial={false}>
      <motion.div key={pathname} variants={pageTransition} initial="hidden" animate="visible" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
