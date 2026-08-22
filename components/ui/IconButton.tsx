import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-out-quart focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:brightness-95 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
        secondary: "border border-border bg-surface-raised text-foreground hover:border-border-strong",
        ghost: "text-foreground-secondary hover:bg-surface hover:text-foreground",
        outline: "border border-border-strong text-foreground hover:border-accent hover:text-accent",
      },
      size: {
        sm: "size-8",
        md: "size-10",
        lg: "size-12",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

const iconSizeBySize = {
  sm: "size-3.5",
  md: "size-4.5",
  lg: "size-5",
} as const;

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "children">,
    VariantProps<typeof iconButtonVariants> {
  /** Render as the single child element (e.g. an anchor for an external link) instead of a <button>, merging IconButton's classes/behaviour onto it — the icon renders inside it. */
  asChild?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  /** Required — an icon-only control has no visible text, so this is its only accessible name. */
  "aria-label": string;
  /** Only meaningful with `asChild` — the element to render instead of <button>. */
  children?: ReactNode;
}

/**
 * Circular icon-only control — carousel prev/next, close, social links. See
 * Button for anything with visible text.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled = false,
      icon: Icon,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;
    const resolvedSize = size ?? "md";
    const iconEl = loading ? (
      <Loader2 className={cn(iconSizeBySize[resolvedSize], "animate-spin")} aria-hidden="true" />
    ) : (
      <Icon className={iconSizeBySize[resolvedSize]} aria-hidden="true" />
    );

    return (
      <Comp
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, className }))}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={asChild ? isDisabled : undefined}
        aria-busy={loading || undefined}
        tabIndex={asChild && isDisabled ? -1 : undefined}
        {...props}
      >
        {asChild ? <Slottable>{children}</Slottable> : iconEl}
        {asChild ? iconEl : null}
      </Comp>
    );
  },
);

IconButton.displayName = "IconButton";
