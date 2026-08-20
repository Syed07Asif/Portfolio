import { cn } from "@/lib/utils";

interface BlobConfig {
  /** Position/size — corners only, deliberately kept clear of the text column. Hidden on smaller breakpoints to cap effect cost on mobile. */
  className: string;
  /** Drift keyframe class from styles/globals.css — one per blob so each moves on its own path and period. */
  driftClassName: string;
}

const BLOBS: BlobConfig[] = [
  { className: "-top-24 -left-24 size-80 bg-accent sm:size-96", driftClassName: "hero-blob-a" },
  { className: "top-1/3 -right-20 hidden size-72 bg-glow-cyan sm:block", driftClassName: "hero-blob-b" },
  { className: "-bottom-24 left-1/4 hidden size-64 bg-glow-warm lg:block", driftClassName: "hero-blob-c" },
];

/**
 * Purely decorative (`aria-hidden`) ambient background for Hero — large,
 * heavily blurred, low-opacity colour washes in the corners, never behind the
 * text column.
 *
 * **This is a Server Component** (Phase 24). It was `"use client"` to run a
 * Framer Motion drift plus a `useInView` that paused it off-screen; both are
 * now the `hero-blob-*` keyframes in styles/globals.css. The drift only ever
 * touched `transform`, so it was already compositor-only — moving it to CSS
 * keeps that and removes the observer, the hydration cost, and the client
 * boundary sitting directly in the hero's critical path. Pausing off-screen
 * is no longer needed: a compositor-only transform animation on an
 * off-screen layer costs effectively nothing.
 *
 * Reduced motion is handled in the stylesheet — the whole `hero-blob-*`
 * block lives inside `@media (prefers-reduced-motion: no-preference)`, so the
 * blobs are simply static washes for anyone who asked for less motion.
 */
export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {BLOBS.map((blob) => (
        <div
          key={blob.driftClassName}
          className={cn("absolute rounded-full opacity-25 blur-3xl", blob.className, blob.driftClassName)}
        />
      ))}
    </div>
  );
}
