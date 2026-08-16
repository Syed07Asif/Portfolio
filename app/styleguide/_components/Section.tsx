import type { ReactNode } from "react";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-border pt-12 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 font-display font-bold text-foreground">{title}</h2>
        {description ? <p className="text-body text-foreground-muted max-w-2xl">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
