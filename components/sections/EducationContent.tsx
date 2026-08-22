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
        <div className="reveal" key={entry.id}>
          <EducationItem entry={entry} />
        </div>
      ))}
    </div>
  );
}
