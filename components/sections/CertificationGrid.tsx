"use client";

import { motion } from "motion/react";
import { revealOnScroll, staggerContainer, staggerItem } from "@/lib/motion";
import { CertificationCard } from "./CertificationCard";
import type { Certification } from "@/types/content";

export interface CertificationGridProps {
  certifications: Certification[];
}

/** Same grid + stagger treatment as ProjectGrid — same reasoning applies (a reasonably-sized set that's typically fully visible together, unlike Experience's long vertical timeline). */
export function CertificationGrid({ certifications }: CertificationGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      {...revealOnScroll}
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {certifications.map((certification) => (
        <motion.div key={certification.id} variants={staggerItem}>
          <CertificationCard certification={certification} />
        </motion.div>
      ))}
    </motion.div>
  );
}
