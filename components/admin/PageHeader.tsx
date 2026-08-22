import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";

export interface PageHeaderAction {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: PageHeaderAction;
}

/** Title + primary action, shared by every entity's list page. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  const ActionIcon = action?.icon ?? PlusIcon;

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-h3 font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-body text-foreground-muted">{description}</p> : null}
      </div>
      {action ? (
        <Button asChild>
          <Link href={action.href}>
            <ActionIcon className="size-4" />
            {action.label}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
