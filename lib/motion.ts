import type { Variants } from "motion/react";

/**
 * Reusable Framer Motion variants — every section imports from here rather
 * than inventing its own animation. Reduced-motion handling is automatic
 * (see components/motion/MotionProvider.tsx) and needs no per-variant work.
 *
 * Durations and easing curves mirror styles/tokens.css's --duration- and
 * --ease- values. They're re-declared here, not read from the CSS custom
 * properties, because Framer Motion variants are plain JS objects evaluated
 * at module load (including during SSR, before any stylesheet exists) —
 * there's no DOM to read `getComputedStyle` from at that point. If a
 * duration or easing token changes in tokens.css, update the matching
 * constant below.
 */

const DURATION = {
  fast: 0.15, // --duration-fast
  base: 0.3, // --duration-base
  slow: 0.5, // --duration-slow
  slower: 0.8, // --duration-slower
} as const;

const EASE = {
  outExpo: [0.16, 1, 0.3, 1], // --ease-out-expo
  outQuart: [0.25, 1, 0.5, 1], // --ease-out-quart
  inOutQuart: [0.76, 0, 0.24, 1], // --ease-in-out-quart
  spring: [0.34, 1.56, 0.64, 1], // --ease-spring
} as const satisfies Record<string, [number, number, number, number]>;

// -- Entrance variants --------------------------------------------------

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.outExpo },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.base, ease: EASE.outQuart },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE.outExpo },
  },
};

// -- Stagger --------------------------------------------------------------
// Usage: <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
//          <motion.li variants={staggerItem} />

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.outExpo },
  },
};

// -- Scroll reveal ----------------------------------------------------------
// Spread onto a motion element alongside one of the entrance variants above:
//   <motion.div variants={fadeInUp} {...revealOnScroll}>
// Triggers once, slightly before the element reaches the viewport edge.

export const revealOnScroll = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, margin: "-80px" },
} as const;

// -- Hover interactions -----------------------------------------------------
// Spread as `whileHover` on cards/interactive surfaces:
//   <motion.div whileHover={hoverLift}> or {...hoverLift, ...hoverGlow} merged as needed

export const hoverLift = {
  y: -6,
  transition: { duration: DURATION.fast, ease: EASE.outQuart },
};

export const hoverGlow = {
  boxShadow: "var(--glow-accent-md)",
  transition: { duration: DURATION.fast, ease: EASE.outQuart },
};

// -- Page transitions ---------------------------------------------------

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.outQuart },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DURATION.fast, ease: EASE.outQuart },
  },
};
