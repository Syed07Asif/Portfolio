import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  createHref: string;
  createLabel: string;
}

/**
 * The admin panel's own "no items yet" state — deliberately separate from
 * `components/ui/EmptyState` (the public-site version), which has no
 * action button and shouldn't grow one just for this: per CLAUDE.md's
 * admin/public primitive boundary, the two are allowed to diverge rather
 * than share a component that has to serve both.
 */
export function EmptyState({ icon: Icon, title, description, createHref, createLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <Icon className="size-8 text-foreground-muted" aria-hidden="true" />
      <p className="text-body-lg font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-body text-foreground-muted">{description}</p> : null}
      <Button asChild className="mt-2">
        <Link href={createHref}>
          <PlusIcon className="size-4" />
          {createLabel}
        </Link>
      </Button>
    </div>
  );
}
