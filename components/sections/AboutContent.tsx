import { Briefcase, MapPin, PenLine, Sparkles, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { AboutPortrait } from "./AboutPortrait";

interface QuickFact {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface AboutContentProps {
  name: string;
  avatarUrl: string | null;
  bioParagraphs: string[];
  currentRole?: string | null;
  location?: string | null;
  /** profile.headline, doubling as the "focus area" fact — the schema has no separate focus_area field, and headline ("Analytics & ML Engineer") already reads as one. */
  focusArea?: string | null;
  availability?: string | null;
}

/**
 * The About section's animated content: a portrait/text grid that scroll-
 * reveals as a `.reveal-group` (each direct child fades up as it enters).
 *
 * **Layout, and why it is placed explicitly.** On a laptop the portrait is
 * an aspect-ratio box and the bio is however long the database says — 350px
 * of image next to 975px of text left a 600px hole in the left column. Two
 * things close it: the portrait is taller than it is wide from `lg` up
 * (4:5, a portrait crop rather than a square), and the quick facts move out
 * from under the bio into that leftover space as a panel beneath the
 * portrait.
 *
 * That reshuffle is done with explicit `col-start`/`row-start` placement
 * rather than by reordering the DOM, so the single-column mobile layout —
 * portrait, bio, facts, in source order, which is the reading order that
 * makes sense on a phone — is completely untouched. `lg:grid-rows-[auto_1fr]`
 * matters more than it looks: without it the bio's row-span would push half
 * its extra height into row one and float the facts panel away from the
 * portrait. `items-start` keeps the portrait from being stretched by its
 * taller sibling.
 */
export function AboutContent({
  name,
  avatarUrl,
  bioParagraphs,
  currentRole,
  location,
  focusArea,
  availability,
}: AboutContentProps) {
  const facts: QuickFact[] = [
    currentRole ? { label: "Role", value: currentRole, icon: Briefcase } : null,
    location ? { label: "Location", value: location, icon: MapPin } : null,
    focusArea ? { label: "Focus", value: focusArea, icon: Target } : null,
    availability ? { label: "Availability", value: availability, icon: Sparkles } : null,
  ].filter((fact): fact is QuickFact => fact !== null);

  return (
    <div className="reveal-group grid grid-cols-1 items-start gap-10 lg:grid-cols-5 lg:grid-rows-[auto_1fr] lg:gap-12">
      <div className="mx-auto w-full max-w-sm lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:max-w-none">
        <AboutPortrait src={avatarUrl} name={name} />
      </div>

      <div className="flex flex-col gap-4 lg:col-span-3 lg:col-start-3 lg:row-span-2 lg:row-start-1">
        {bioParagraphs.length > 0 ? (
          bioParagraphs.map((paragraph, index) => (
            <p key={index} className="text-body-lg text-foreground-secondary">
              {paragraph}
            </p>
          ))
        ) : (
          <EmptyState
            icon={PenLine}
            title="Bio coming soon"
            description="A full introduction is on its way — check back shortly."
          />
        )}
      </div>

      {facts.length > 0 ? (
        /*
         * One block, two shapes. On a phone it stays what it always was: a
         * wrapping row of icon + value under the bio, separated by a hairline.
         * From `lg` it becomes a card in the portrait's column — a vertical
         * list with the label shown above each value, which is only legible
         * because the column is narrow and the rows are stacked.
         */
        <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-6 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:flex-col lg:gap-5 lg:rounded-xl lg:border lg:bg-surface lg:p-6">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-center gap-2 lg:items-start lg:gap-3">
              <fact.icon className="size-4 shrink-0 text-accent lg:mt-1" aria-hidden="true" />
              <div className="flex min-w-0 flex-col lg:gap-1">
                <span className="hidden text-caption text-foreground-muted uppercase lg:block">
                  {fact.label}
                </span>
                <span className="text-small text-foreground-secondary lg:text-body lg:text-foreground">
                  {fact.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
