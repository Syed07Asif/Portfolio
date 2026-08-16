import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeadingLevel = 2 | 3 | 4;

const headingClassNameByLevel: Record<SectionHeadingLevel, string> = {
  2: "text-h2 font-display font-bold",
  3: "text-h3 font-display font-semibold",
  4: "text-h4 font-display font-semibold",
};

export interface SectionHeadingProps {
  /** Small label above the heading, e.g. "What I do". */
  eyebrow?: string;
  heading: ReactNode;
  description?: ReactNode;
  /** Rendered on the same row as the heading, right-aligned — e.g. a "View all" link. */
  action?: ReactNode;
  /** Semantic heading level. Defaults to h2 — use h3/h4 for a heading nested inside another section's h2. */
  level?: SectionHeadingLevel;
  className?: string;
}

/**
 * Consistent eyebrow/heading/description block used at the top of every
 * Section. Content-agnostic — every string comes from the caller.
 */
export function SectionHeading({
  eyebrow,
  heading,
  description,
  action,
  level = 2,
  className,
}: SectionHeadingProps) {
  const Heading = `h${level}` as "h2" | "h3" | "h4";

  return (
    <div className={cn("flex flex-col gap-4 pb-10 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex flex-col gap-3">
        {eyebrow ? (
          <p className="text-caption font-medium uppercase tracking-wider text-accent">{eyebrow}</p>
        ) : null}
        <Heading className={cn(headingClassNameByLevel[level], "text-foreground")}>{heading}</Heading>
        {description ? (
          <p className="text-body-lg text-foreground-secondary max-w-2xl">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
