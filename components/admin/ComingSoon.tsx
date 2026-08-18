import { Construction } from "lucide-react";

export interface ComingSoonProps {
  section: string;
}

/**
 * Shared placeholder for every sidebar destination this phase doesn't
 * build an editor for yet (Phase 17 is auth + shell only — see
 * docs/progress.md). Exists so every nav link actually resolves instead of
 * 404ing; the real content-editor phase for each entity replaces its own
 * page.tsx with this removed, the same "build the seam, not the feature"
 * pattern Phase 13's ProjectMediaGallery stub used.
 */
export function ComingSoon({ section }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-20 text-center">
      <Construction className="size-8 text-foreground-muted" aria-hidden="true" />
      <p className="text-body-lg font-medium text-foreground">{section} editor coming soon</p>
      <p className="max-w-sm text-small text-foreground-muted">
        This section&apos;s content is already driven by the database — the editor UI for it ships in a later phase.
      </p>
    </div>
  );
}
