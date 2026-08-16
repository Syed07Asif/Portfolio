import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

/**
 * The controlled fallback rendered anywhere content is missing (a section
 * with zero published rows, a failed fetch that returned null/[]) instead
 * of leaving a blank gap.
 */
export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      <Icon className="size-8 text-foreground-muted" aria-hidden="true" />
      <p className="text-body-lg font-medium text-foreground">{title}</p>
      {description ? <p className="text-body text-foreground-muted max-w-sm">{description}</p> : null}
    </div>
  );
}
