import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-small font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-raised text-foreground-secondary",
        accent: "bg-accent/15 text-accent",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-danger/15 text-danger",
        info: "bg-info/15 text-info",
        outline: "border border-border-strong text-foreground-secondary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/**
 * Status/emphasis pill — e.g. a project's status, "Featured", a rating.
 * For lightweight repeated labels like a tech stack list, use Tag instead.
 */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
