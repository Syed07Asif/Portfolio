import { cn } from "@/lib/utils";

export interface StatusPillProps {
  published: boolean;
  className?: string;
}

/** Same dot+label shape as the dashboard's published/draft counts (app/admin/(protected)/page.tsx) — reused here as its own component since AdminTable needs it per-row. */
export function StatusPill({ published, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium",
        published ? "bg-success/10 text-success" : "bg-surface-raised text-foreground-muted",
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", published ? "bg-success" : "bg-foreground-muted")}
        aria-hidden="true"
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}
