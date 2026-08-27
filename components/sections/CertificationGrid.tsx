import { cn, gridColumnsForCount } from "@/lib/utils";
import { CertificationCard } from "./CertificationCard";
import type { Certification } from "@/types/content";

export interface CertificationGridProps {
  certifications: Certification[];
}

/**
 * Same grid treatment as ProjectGrid, for the same reason (a reasonably-sized
 * set that's typically fully visible together, unlike Experience's long
 * vertical timeline) — including the column count capped by how many
 * certifications exist, so two never leave an empty third column.
 */
export function CertificationGrid({ certifications }: CertificationGridProps) {
  return (
    <div className={cn("reveal-group grid grid-cols-1 gap-6", gridColumnsForCount(certifications.length))}>
      {certifications.map((certification) => (
        <div key={certification.id}>
          <CertificationCard certification={certification} />
        </div>
      ))}
    </div>
  );
}
