import { Avatar, Badge, Card, Tag } from "@/components/ui";
import { formatDateRange, formatDuration } from "@/lib/utils";
import type { Experience } from "@/types/content";

export interface ExperienceItemProps {
  entry: Experience;
}

/**
 * One timeline entry's card content — used by both the mobile and desktop
 * structural wrappers in ExperienceContent.tsx (deliberately two DOM copies
 * behind responsive `hidden`/`md:flex` visibility, the same pattern
 * Navbar's mobile-menu-vs-desktop-nav already uses in this codebase; safe
 * here since a card has no interactive state to desync between copies —
 * see ExperienceContent.tsx's header comment on the description-length
 * decision).
 */
export function ExperienceItem({ entry }: ExperienceItemProps) {
  const meta = [
    entry.location,
    entry.employment_type,
  ].filter((value): value is string => Boolean(value));

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <Avatar src={entry.company_logo_url} name={entry.company} size="lg" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-h4 font-display font-semibold text-foreground">{entry.role}</h3>
            {entry.is_current ? <Badge variant="success">Current</Badge> : null}
          </div>

          {entry.link_url ? (
            <a
              href={entry.link_url}
              target="_blank"
              rel="noreferrer noopener"
              className="w-fit text-body font-medium text-foreground-secondary transition-colors duration-fast ease-out-quart hover:text-accent"
            >
              {entry.company}
            </a>
          ) : (
            <p className="text-body font-medium text-foreground-secondary">{entry.company}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-foreground-muted">
            <span>{formatDateRange(entry.start_date, entry.end_date, entry.is_current)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(entry.start_date, entry.end_date, entry.is_current)}</span>
            {meta.map((value) => (
              <span key={value} className="flex items-center gap-2">
                <span aria-hidden="true">·</span>
                <span>{value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {entry.description ? (
        <p className="text-body text-foreground-secondary">{entry.description}</p>
      ) : null}

      {entry.responsibilities?.length ? (
        <ul className="flex flex-col gap-2">
          {entry.responsibilities.map((responsibility) => (
            <li key={responsibility} className="flex gap-2.5 text-body text-foreground-secondary">
              <span className="mt-2.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>{responsibility}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {entry.technologies?.length ? (
        <div className="flex flex-wrap gap-2">
          {entry.technologies.map((technology) => (
            <Tag key={technology}>{technology}</Tag>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
