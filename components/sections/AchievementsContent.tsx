import { AchievementItem } from "./AchievementItem";
import type { Achievement } from "@/types/content";

export interface AchievementsContentProps {
  items: Achievement[];
}

/**
 * A compact vertical list rather than a card grid (the brief's other
 * offered option) — chosen to read as a different content type from the
 * Certifications grid right above it and from Projects further up, while
 * still composing the same Card primitive. Each row reveals independently
 * (`fadeInUp` + `revealOnScroll`, not a shared `staggerContainer`), same
 * reasoning as ExperienceContent: a long list shouldn't all animate in at
 * once the moment its top edge appears.
 */
export function AchievementsContent({ items }: AchievementsContentProps) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li className="reveal" key={item.id}>
          <AchievementItem achievement={item} />
        </li>
      ))}
    </ul>
  );
}
