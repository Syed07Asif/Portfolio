const steps = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32];

const stepClassNames: Record<number, string> = {
  1: "w-1",
  2: "w-2",
  3: "w-3",
  4: "w-4",
  6: "w-6",
  8: "w-8",
  10: "w-10",
  12: "w-12",
  16: "w-16",
  20: "w-20",
  24: "w-24",
  32: "w-32",
};

export function SpacingScale() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-caption uppercase tracking-wider text-foreground-muted">
          Numeric scale (derives from --spacing, e.g. p-4, gap-6)
        </span>
        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <div key={step} className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-small text-foreground-muted">{step}</span>
              <div className={`h-3 rounded-sm bg-accent ${stepClassNames[step]}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-caption uppercase tracking-wider text-foreground-muted">
          Section rhythm tokens
        </span>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div
              className="rounded-md border border-dashed border-accent-muted bg-accent/10"
              style={{ paddingBlock: "var(--space-section-y)" }}
            >
              <p className="text-center text-small text-foreground-muted">--space-section-y (6rem)</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div
              className="rounded-md border border-dashed border-accent-muted bg-accent/10"
              style={{ paddingInline: "var(--space-container-x)" }}
            >
              <p className="py-2 text-center text-small text-foreground-muted">
                --space-container-x (1.5rem, left + right)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
