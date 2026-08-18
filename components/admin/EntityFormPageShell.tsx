import type { ReactNode } from "react";

export interface EntityFormPageShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Consistent create/edit page wrapper — every entity's `new/page.tsx` and `[id]/edit/page.tsx` are just this plus `<EntityForm>`. */
export function EntityFormPageShell({ title, description, children }: EntityFormPageShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-h3 font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-body text-foreground-muted">{description}</p> : null}
      </div>
      <div className="rounded-xl border border-border bg-surface p-6">{children}</div>
    </div>
  );
}
