"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  fadeIn,
  fadeInUp,
  hoverGlow,
  hoverLift,
  pageTransition,
  revealOnScroll,
  scaleIn,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

function ReplayDemo({
  label,
  variants,
}: {
  label: string;
  variants: typeof fadeInUp;
}) {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="flex flex-col items-start gap-3">
      <span className="text-small text-foreground-muted">{label}</span>
      <div className="flex h-20 w-full items-center justify-center rounded-lg border border-border bg-surface">
        <motion.div
          key={replayKey}
          variants={variants}
          initial="hidden"
          animate="visible"
          className="rounded-md bg-accent px-4 py-2 text-caption font-medium uppercase tracking-wider text-accent-foreground"
        >
          {label}
        </motion.div>
      </div>
      <button
        type="button"
        onClick={() => setReplayKey((key) => key + 1)}
        className="rounded-full border border-border-strong px-3 py-1 text-caption uppercase tracking-wider text-foreground-secondary transition-colors hover:border-accent hover:text-accent"
      >
        Replay
      </button>
    </div>
  );
}

function StaggerDemo() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="flex flex-col items-start gap-3">
      <span className="text-small text-foreground-muted">staggerContainer + staggerItem</span>
      <motion.div
        key={replayKey}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-wrap gap-3 rounded-lg border border-border bg-surface p-4"
      >
        {["Python", "SQL", "scikit-learn", "Airflow"].map((tag) => (
          <motion.span
            key={tag}
            variants={staggerItem}
            className="rounded-full bg-surface-raised px-3 py-1 text-small text-foreground-secondary"
          >
            {tag}
          </motion.span>
        ))}
      </motion.div>
      <button
        type="button"
        onClick={() => setReplayKey((key) => key + 1)}
        className="rounded-full border border-border-strong px-3 py-1 text-caption uppercase tracking-wider text-foreground-secondary transition-colors hover:border-accent hover:text-accent"
      >
        Replay
      </button>
    </div>
  );
}

function HoverDemo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="text-small text-foreground-muted">hoverLift + hoverGlow</span>
      <motion.div
        whileHover={{ ...hoverLift, ...hoverGlow }}
        className="flex h-20 w-full items-center justify-center rounded-lg border border-border bg-surface-raised text-small text-foreground-secondary"
      >
        Hover me
      </motion.div>
    </div>
  );
}

function RevealDemo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="text-small text-foreground-muted">
        revealOnScroll (scroll this element in and out of view)
      </span>
      <motion.div
        variants={fadeInUp}
        {...revealOnScroll}
        className="flex h-20 w-full items-center justify-center rounded-lg border border-border bg-surface text-small text-foreground-secondary"
      >
        I reveal once, on scroll into view
      </motion.div>
    </div>
  );
}

function PageTransitionDemo() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="flex flex-col items-start gap-3">
      <span className="text-small text-foreground-muted">pageTransition (AnimatePresence)</span>
      <div className="flex h-20 w-full items-center justify-center rounded-lg border border-border bg-surface">
        <AnimatePresence mode="wait">
          {visible ? (
            <motion.div
              key="a"
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="rounded-md bg-accent px-4 py-2 text-caption font-medium uppercase tracking-wider text-accent-foreground"
            >
              Page A
            </motion.div>
          ) : (
            <motion.div
              key="b"
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="rounded-md bg-surface-raised px-4 py-2 text-caption font-medium uppercase tracking-wider text-foreground"
            >
              Page B
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="rounded-full border border-border-strong px-3 py-1 text-caption uppercase tracking-wider text-foreground-secondary transition-colors hover:border-accent hover:text-accent"
      >
        Toggle
      </button>
    </div>
  );
}

export function MotionDemos() {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <ReplayDemo label="fadeInUp" variants={fadeInUp} />
      <ReplayDemo label="fadeIn" variants={fadeIn} />
      <ReplayDemo label="scaleIn" variants={scaleIn} />
      <StaggerDemo />
      <HoverDemo />
      <PageTransitionDemo />
      <div className="sm:col-span-2 lg:col-span-3">
        <RevealDemo />
      </div>
    </div>
  );
}
