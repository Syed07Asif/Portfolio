import { Avatar, Card } from "@/components/ui";
import { formatOptionalDateRange } from "@/lib/utils";
import type { Education } from "@/types/content";

export interface EducationItemProps {
  entry: Education;
}

/** Card content for one education entry — visually matches ExperienceItem (same Avatar/heading/meta-row treatment) without the timeline rail, since education doesn't carry the same chronological-flow emphasis as work history. */
export function EducationItem({ entry }: EducationItemProps) {
  const dates = formatOptionalDateRange(entry.start_date, entry.end_date, {
    end: "Graduated",
    start: "Started",
  });
  const fieldLabel = entry.field_of_study ? `${entry.degree} · ${entry.field_of_study}` : entry.degree;

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <Avatar src={entry.institution_logo_url} name={entry.institution} size="lg" />
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-h4 font-display font-semibold text-foreground">{fieldLabel}</h3>

          {entry.link_url ? (
            <a
              href={entry.link_url}
              target="_blank"
              rel="noreferrer noopener"
              className="w-fit text-body font-medium text-foreground-secondary transition-colors duration-fast ease-out-quart hover:text-accent"
            >
              {entry.institution}
            </a>
          ) : (
            <p className="text-body font-medium text-foreground-secondary">{entry.institution}</p>
          )}

          {dates || entry.grade ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-foreground-muted">
              {dates ? <span>{dates}</span> : null}
              {dates && entry.grade ? <span aria-hidden="true">·</span> : null}
              {entry.grade ? <span>{entry.grade}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {entry.description ? (
        <p className="text-body text-foreground-secondary">{entry.description}</p>
      ) : null}
    </Card>
  );
}
