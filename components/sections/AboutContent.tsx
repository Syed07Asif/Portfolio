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
 * reveals with `revealOnScroll` and staggers its two halves via
 * `staggerContainer`/`staggerItem` (both from lib/motion.ts, unmodified).
 * `items-start` on the grid is deliberate — the bio can be 40 words or 400,
 * and the portrait must never stretch (or get stretched by its sibling) to
 * match; it stays a fixed aspect-square regardless of text length.
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
    <div
      className="reveal-group grid grid-cols-1 items-start gap-10 lg:grid-cols-3 lg:gap-16"
    >
      <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
        <AboutPortrait src={avatarUrl} name={name} />
      </div>

      <div className="flex flex-col gap-8 lg:col-span-2">
        {bioParagraphs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {bioParagraphs.map((paragraph, index) => (
              <p key={index} className="text-body-lg text-foreground-secondary">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PenLine}
            title="Bio coming soon"
            description="A full introduction is on its way — check back shortly."
          />
        )}

        {facts.length > 0 ? (
          <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-6">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-center gap-2">
                <fact.icon className="size-4 text-accent" aria-hidden="true" />
                <span className="text-small text-foreground-secondary">{fact.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
