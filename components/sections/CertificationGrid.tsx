import { CertificationCard } from "./CertificationCard";
import type { Certification } from "@/types/content";

export interface CertificationGridProps {
  certifications: Certification[];
}

/** Same grid + stagger treatment as ProjectGrid — same reasoning applies (a reasonably-sized set that's typically fully visible together, unlike Experience's long vertical timeline). */
export function CertificationGrid({ certifications }: CertificationGridProps) {
  return (
    <div
      className="reveal-group grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {certifications.map((certification) => (
        <div key={certification.id}>
          <CertificationCard certification={certification} />
        </div>
      ))}
    </div>
  );
}
