import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-small",
  {
    variants: {
      variant: {
        /** Visible border/surface — a standalone tag or short list. */
        default: "border border-border bg-surface-raised text-foreground-secondary",
        /** No border, lower-contrast background — for dense lists (e.g. a long tech-stack row) where a full default tag per item would be too heavy. */
        subtle: "bg-surface text-foreground-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface TagProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {}

/**
 * Lightweight repeated label — technologies, categories. See Badge for
 * status/emphasis pills instead.
 */
export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant, className }))} {...props} />;
}
