const radii = [
  { label: "sm", className: "rounded-sm" },
  { label: "md", className: "rounded-md" },
  { label: "lg", className: "rounded-lg" },
  { label: "xl", className: "rounded-xl" },
  { label: "2xl", className: "rounded-2xl" },
  { label: "full", className: "rounded-full" },
];

const borderWidths = [
  { label: "thin (1px, border)", className: "border" },
  { label: "medium (1.5px, token-only)", className: "border-[length:var(--border-width-medium)]" },
  { label: "thick (2px, border-2)", className: "border-2" },
];

export function RadiusScale() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {radii.map((radius) => (
          <div key={radius.label} className="flex flex-col items-center gap-2">
            <div className={`h-16 w-16 bg-accent ${radius.className}`} />
            <span className="text-small text-foreground-muted">{radius.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-caption uppercase tracking-wider text-foreground-muted">Border widths</span>
        <div className="flex flex-wrap gap-4">
          {borderWidths.map((width) => (
            <div key={width.label} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-24 rounded-md border-border bg-surface ${width.className}`} />
              <span className="text-small text-foreground-muted">{width.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
