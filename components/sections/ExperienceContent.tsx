import { cn, formatDateRange, formatDuration } from "@/lib/utils";
import { ExperienceItem } from "./ExperienceItem";
import type { Experience } from "@/types/content";

/**
 * The connecting rail: a dot plus a downward line to the *next* item only —
 * never an upward one. Each `<li>` owns just the segment below its own dot,
 * so the first item naturally has nothing above it and the last has
 * nothing below, without special-casing either end beyond skipping the
 * line on the last item. The line is a flex sibling of the card (not
 * absolutely positioned), so it stretches to match however tall that
 * card's content turns out to be — a 400-word description and a 2-line one
 * both get a correctly-sized connector for free, no measurement needed.
 *
 * The line carries `timeline-line`, which draws it downward as the entry
 * scrolls into view (styles/globals.css — CSS scroll-driven, desktop only,
 * and off entirely under `prefers-reduced-motion`).
 */
function Rail({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex w-10 shrink-0 flex-col items-center">
      <span className="mt-2 size-3 shrink-0 rounded-full border-2 border-accent bg-background" aria-hidden="true" />
      {!isLast ? <span className="timeline-line w-px flex-1 bg-border" aria-hidden="true" /> : null}
    </div>
  );
}

/**
 * The desktop-only date column to the left of the rail. It renders exactly
 * the dates the card stops rendering in `split` mode (see ExperienceItem) —
 * the information is moved, never duplicated, so a screen reader hears it
 * once per entry.
 */
function TimelineDates({ entry }: { entry: Experience }) {
  return (
    <div className="w-48 shrink-0 pt-0.5 text-right">
      <p className="text-small font-medium text-foreground">
        {formatDateRange(entry.start_date, entry.end_date, entry.is_current)}
      </p>
      <p className="text-caption text-foreground-muted uppercase">
        {formatDuration(entry.start_date, entry.end_date, entry.is_current)}
      </p>
    </div>
  );
}

export interface ExperienceContentProps {
  entries: Experience[];
}

/**
 * Descriptions render at full length uniformly (no clamp/expand) — the
 * rail above already handles arbitrary card height gracefully via natural
 * flex sizing, so there's no layout reason to truncate, and skipping
 * clamp/expand avoids needing interactive state that two DOM copies of the
 * same entry (mobile/tablet vs desktop wrapper, below) would have to keep
 * in sync.
 *
 * Each entry reveals independently via `.reveal` (not a shared
 * `.reveal-group`) — with up to a dozen entries spanning well past one
 * screen, a single parent-triggered stagger would fire the whole list at
 * once as soon as the container's top edge appeared, instead of each entry
 * animating in as the reader actually scrolls to it.
 *
 * **The desktop layout used to alternate left/right around a centred rail.**
 * It looked balanced in a mockup and hollow in practice: every row rendered
 * one `max-w-lg` card against an empty half-width column, so on a laptop
 * roughly half of the section was blank, and with only two or three entries
 * that reads as unfinished rather than as spacing. It is now a single
 * left-anchored column — dates, rail, then a card that takes all remaining
 * width — which is both the conventional résumé timeline and the shape that
 * stays full no matter how many entries exist.
 *
 * The split only starts at `lg`, not at `md`: a tablet does not have the
 * ~200px to spare for a date column without squeezing the card hard enough
 * to wrap a job title across three lines, so 768-1023px keeps the simple
 * full-width rail-and-card shape instead.
 */
export function ExperienceContent({ entries }: ExperienceContentProps) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;

        return (
          <li key={entry.id} className="reveal relative">
            {/* Mobile / tablet: rail on the left, single column, dates inside the card. */}
            <div className="flex gap-4 lg:hidden">
              <Rail isLast={isLast} />
              <div className={cn("min-w-0 flex-1", !isLast && "pb-10")}>
                <ExperienceItem entry={entry} />
              </div>
            </div>

            {/* Desktop: date column, rail, then a full-width card. */}
            <div className="hidden lg:flex lg:gap-4">
              <TimelineDates entry={entry} />
              <Rail isLast={isLast} />
              <div className={cn("min-w-0 flex-1", !isLast && "pb-12")}>
                <ExperienceItem entry={entry} variant="split" />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
