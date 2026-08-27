import { Avatar, Badge, Card, Tag } from "@/components/ui";
import { cn, formatDateRange, formatDuration } from "@/lib/utils";
import type { Experience } from "@/types/content";

/**
 * `stacked` puts every piece of meta inside the card, under the company
 * name — the phone layout, where the card is the only column there is.
 * `split` is the desktop one: the date range and duration are dropped
 * because ExperienceContent's date column already renders them beside the
 * rail, and location / employment type move to the far end of the header
 * row so a card that now spans the full content width has something
 * anchoring both of its edges instead of a long empty stretch.
 */
export type ExperienceItemVariant = "stacked" | "split";

export interface ExperienceItemProps {
  entry: Experience;
  variant?: ExperienceItemVariant;
}

/**
 * One timeline entry's card content — used by both the mobile and desktop
 * structural wrappers in ExperienceContent.tsx (deliberately two DOM copies
 * behind responsive `hidden`/`md:flex` visibility, the same pattern
 * Navbar's mobile-menu-vs-desktop-nav already uses in this codebase; safe
 * here since a card has no interactive state to desync between copies —
 * see ExperienceContent.tsx's header comment on the description-length
 * decision). Only one copy is ever displayed, so the duplicated meta is
 * announced once, not twice.
 */
export function ExperienceItem({ entry, variant = "stacked" }: ExperienceItemProps) {
  const isSplit = variant === "split";

  const placeMeta = [
    entry.location,
    entry.employment_type,
  ].filter((value): value is string => Boolean(value));

  const inlineMeta = isSplit
    ? []
    : [
        formatDateRange(entry.start_date, entry.end_date, entry.is_current),
        formatDuration(entry.start_date, entry.end_date, entry.is_current),
        ...placeMeta,
      ];

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

          {inlineMeta.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-foreground-muted">
              {inlineMeta.map((value, index) => (
                <span key={value} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true">·</span> : null}
                  <span>{value}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {isSplit && placeMeta.length > 0 ? (
          <div className="flex shrink-0 flex-col items-end gap-1 pt-1 text-small text-foreground-muted">
            {placeMeta.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>
        ) : null}
      </div>

      {entry.description ? (
        <p className="text-body text-foreground-secondary">{entry.description}</p>
      ) : null}

      {entry.responsibilities?.length ? (
        /*
         * Four or more bullets split into two columns on a wide card: at the
         * full content width a single column of short bullets is mostly
         * empty space to the right of each one. Fewer than four stay in one
         * column, where two would just look like a broken grid.
         */
        <ul
          className={cn(
            "flex flex-col gap-2",
            isSplit && entry.responsibilities.length >= 4 && "lg:grid lg:grid-cols-2 lg:gap-x-8",
          )}
        >
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
