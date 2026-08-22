const shadows = [
  { label: "shadow-sm", className: "shadow-sm" },
  { label: "shadow-md", className: "shadow-md" },
  { label: "shadow-lg", className: "shadow-lg" },
  { label: "shadow-glow-accent-sm", className: "shadow-glow-accent-sm" },
  { label: "shadow-glow-accent-md", className: "shadow-glow-accent-md" },
  { label: "shadow-glow-accent-lg", className: "shadow-glow-accent-lg" },
  { label: "shadow-glow-cyan", className: "shadow-glow-cyan" },
  { label: "shadow-glow-warm", className: "shadow-glow-warm" },
];

export function ShadowScale() {
  return (
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
      {shadows.map((shadow) => (
        <div key={shadow.label} className="flex flex-col items-center gap-3">
          <div className={`h-16 w-16 rounded-lg bg-surface-raised ${shadow.className}`} />
          <span className="text-small text-foreground-muted">{shadow.label}</span>
        </div>
      ))}
    </div>
  );
}
