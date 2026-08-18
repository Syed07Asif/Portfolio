import type { ReactNode } from "react";

/**
 * Heading wrapper for this page's own top-level sections. Named distinctly
 * from components/ui/Section (the real page-section primitive, demoed
 * inside the "Primitives" section below) to avoid any confusion between
 * the two — this one is styleguide-page-only scaffolding.
 */
export function StyleguideSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex flex-col gap-6 border-t border-border pt-12 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 font-display font-bold text-foreground">{title}</h2>
        {description ? <p className="text-body text-foreground-muted max-w-2xl">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
