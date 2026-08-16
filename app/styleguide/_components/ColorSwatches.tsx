const swatches: { label: string; cssVar: string; className: string; needsBorder?: boolean }[] = [
  { label: "background", cssVar: "--color-background", className: "bg-background", needsBorder: true },
  { label: "surface", cssVar: "--color-surface", className: "bg-surface" },
  { label: "surface-raised", cssVar: "--color-surface-raised", className: "bg-surface-raised" },
  { label: "overlay", cssVar: "--color-overlay", className: "bg-overlay", needsBorder: true },
  { label: "border", cssVar: "--color-border", className: "bg-border" },
  { label: "border-strong", cssVar: "--color-border-strong", className: "bg-border-strong" },
  { label: "foreground", cssVar: "--color-foreground", className: "bg-foreground" },
  { label: "foreground-secondary", cssVar: "--color-foreground-secondary", className: "bg-foreground-secondary" },
  { label: "foreground-muted", cssVar: "--color-foreground-muted", className: "bg-foreground-muted" },
  { label: "accent", cssVar: "--color-accent", className: "bg-accent" },
  { label: "accent-hover", cssVar: "--color-accent-hover", className: "bg-accent-hover" },
  { label: "accent-muted", cssVar: "--color-accent-muted", className: "bg-accent-muted" },
  { label: "accent-foreground", cssVar: "--color-accent-foreground", className: "bg-accent-foreground", needsBorder: true },
  { label: "glow-cyan", cssVar: "--color-glow-cyan", className: "bg-glow-cyan" },
  { label: "glow-warm", cssVar: "--color-glow-warm", className: "bg-glow-warm" },
  { label: "success", cssVar: "--color-success", className: "bg-success" },
  { label: "warning", cssVar: "--color-warning", className: "bg-warning" },
  { label: "danger", cssVar: "--color-danger", className: "bg-danger" },
  { label: "info", cssVar: "--color-info", className: "bg-info" },
];

export function ColorSwatches() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {swatches.map((swatch) => (
        <div key={swatch.cssVar} className="flex flex-col gap-2">
          <div
            className={`h-16 rounded-lg ${swatch.className} ${swatch.needsBorder ? "border border-border" : ""}`}
          />
          <div className="flex flex-col">
            <span className="text-small font-medium text-foreground">{swatch.label}</span>
            <span className="text-caption text-foreground-muted">{swatch.cssVar}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
