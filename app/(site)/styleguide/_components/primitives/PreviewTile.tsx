import type { ReactNode } from "react";

export function PreviewTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="text-caption uppercase tracking-wider text-foreground-muted">{label}</span>
      {children}
    </div>
  );
}
