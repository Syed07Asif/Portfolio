import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tag used for the title. `p` is right when this sits *inside* a section that already has a heading; `h1` is right when the empty state IS the page (a 404, a dead-end utility route), which would otherwise have no h1 at all. */
export type EmptyStateTitleTag = "p" | "h1" | "h2";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  titleAs?: EmptyStateTitleTag;
  className?: string;
}

/**
 * The controlled fallback rendered anywhere content is missing (a section
 * with zero published rows, a failed fetch that returned null/[]) instead
 * of leaving a blank gap.
 */
export function EmptyState({ icon: Icon, title, description, titleAs = "p", className }: EmptyStateProps) {
  // Only the tag changes — the type treatment stays identical either way, so
  // promoting this to the page's h1 fixes the document outline without
  // touching how the page looks.
  const Title = titleAs;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      <Icon className="size-8 text-foreground-muted" aria-hidden="true" />
      <Title className="text-body-lg font-medium text-foreground">{title}</Title>
      {description ? <p className="text-body text-foreground-muted max-w-sm">{description}</p> : null}
    </div>
  );
}
