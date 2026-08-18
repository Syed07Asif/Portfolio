const scale: { label: string; sample: string; className: string }[] = [
  { label: "display", sample: "Analytics & ML Engineer", className: "text-display font-display font-extrabold" },
  { label: "h1", sample: "Analytics & ML Engineer", className: "text-h1 font-display font-bold" },
  { label: "h2", sample: "Analytics & ML Engineer", className: "text-h2 font-display font-bold" },
  { label: "h3", sample: "Analytics & ML Engineer", className: "text-h3 font-display font-semibold" },
  { label: "h4", sample: "Analytics & ML Engineer", className: "text-h4 font-display font-semibold" },
  {
    label: "body-lg",
    sample: "I build data pipelines and machine learning systems that turn raw data into decisions.",
    className: "text-body-lg font-body text-foreground-secondary",
  },
  {
    label: "body",
    sample: "I build data pipelines and machine learning systems that turn raw data into decisions.",
    className: "text-body font-body text-foreground-secondary",
  },
  {
    label: "small",
    sample: "I build data pipelines and machine learning systems that turn raw data into decisions.",
    className: "text-small font-body text-foreground-muted",
  },
  {
    label: "caption",
    sample: "Show My Projects",
    className: "text-caption font-body font-medium uppercase tracking-wider text-foreground-muted",
  },
];

export function TypeScale() {
  return (
    <div className="flex flex-col gap-6">
      {scale.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 border-b border-border pb-6 last:border-b-0">
          <span className="text-caption uppercase tracking-wider text-foreground-muted">
            text-{item.label}
          </span>
          <p className={`${item.className} text-foreground`}>{item.sample}</p>
        </div>
      ))}
    </div>
  );
}
