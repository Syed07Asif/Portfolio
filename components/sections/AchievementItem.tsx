import { ExternalLink, FileText } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { formatMonthYear } from "@/lib/utils";
import { AchievementThumbnail } from "./AchievementThumbnail";
import type { Achievement } from "@/types/content";

export interface AchievementItemProps {
  achievement: Achievement;
}

/**
 * One compact-list row. Unlike Experience's entries, no field here is
 * guaranteed present (organization and date are both optional) — so the
 * meta row joins whatever's actually there with a dot separator between
 * consecutive items, rather than ExperienceItem's fixed "two guaranteed
 * fields plus optional extras" shape.
 */
export function AchievementItem({ achievement }: AchievementItemProps) {
  const meta = [achievement.organization, achievement.date ? formatMonthYear(achievement.date) : null].filter(
    (value): value is string => Boolean(value),
  );
  const hasActions = Boolean(achievement.external_link || achievement.document_url);

  return (
    <Card padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <AchievementThumbnail src={achievement.image_url} title={achievement.title} />

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-h4 font-display font-semibold text-foreground">{achievement.title}</h3>

        {meta.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-foreground-muted">
            {meta.map((value, index) => (
              <span key={value} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                <span>{value}</span>
              </span>
            ))}
          </div>
        ) : null}

        {achievement.description ? (
          <p className="text-body text-foreground-secondary">{achievement.description}</p>
        ) : null}

        {hasActions ? (
          <div className="flex flex-wrap gap-3 pt-1">
            {achievement.external_link ? (
              <Button asChild variant="outline" size="sm" trailingIcon={ExternalLink}>
                <a href={achievement.external_link} target="_blank" rel="noreferrer noopener">
                  View
                </a>
              </Button>
            ) : null}
            {achievement.document_url ? (
              <Button asChild variant="ghost" size="sm" leadingIcon={FileText}>
                <a href={achievement.document_url} target="_blank" rel="noreferrer noopener">
                  Document
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
