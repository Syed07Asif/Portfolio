"use client";

import { motion } from "motion/react";
import { fadeInUp, revealOnScroll } from "@/lib/motion";
import { EducationItem } from "./EducationItem";
import type { Education } from "@/types/content";

export interface EducationContentProps {
  entries: Education[];
}

/**
 * A simple vertical stack, each entry revealing independently as it scrolls
 * into view (same `fadeInUp` + `revealOnScroll` pattern as
 * ExperienceContent, for the same reason: scales to any entry count
 * without a bulk-cascade timing budget to worry about).
 */
export function EducationContent({ entries }: EducationContentProps) {
  return (
    <div className="flex flex-col gap-6">
      {entries.map((entry) => (
        <motion.div key={entry.id} variants={fadeInUp} {...revealOnScroll}>
          <EducationItem entry={entry} />
        </motion.div>
      ))}
    </div>
  );
}
