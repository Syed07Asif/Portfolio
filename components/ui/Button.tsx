import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-body font-medium transition-colors duration-fast ease-out-quart focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:brightness-95 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
        secondary:
          "border border-border bg-surface-raised text-foreground hover:border-border-strong",
        ghost: "text-foreground-secondary hover:bg-surface hover:text-foreground",
        outline:
          "border border-border-strong text-foreground hover:border-accent hover:text-accent",
        link: "h-auto rounded-none p-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-small",
        md: "h-11 px-6 text-body",
        lg: "h-13 px-8 text-body-lg",
      },
    },
    compoundVariants: [
      // The link variant has no padding/height box, so size only affects its (already-inherited) text scale.
      { variant: "link", size: ["sm", "md", "lg"], class: "h-auto px-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

const iconSizeBySize = {
  sm: "size-4",
  md: "size-4.5",
  lg: "size-5",
} as const;

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    VariantProps<typeof buttonVariants> {
  /** Render as the single child element (e.g. next/link's `Link`) instead of a <button>, merging Button's classes/behaviour onto it. */
  asChild?: boolean;
  /** Shows a spinner in place of the leading icon and marks the button non-interactive without visually jumping its size. */
  loading?: boolean;
  disabled?: boolean;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
}

/**
 * The only button in the public site — every section composes this rather
 * than styling its own. See /styleguide for every variant/size/state.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled = false,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;
    const resolvedSize = size ?? "md";
    const iconClassName = iconSizeBySize[resolvedSize];

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={asChild ? isDisabled : undefined}
        aria-busy={loading || undefined}
        tabIndex={asChild && isDisabled ? -1 : undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn(iconClassName, "animate-spin")} aria-hidden="true" />
        ) : (
          LeadingIcon && <LeadingIcon className={iconClassName} aria-hidden="true" />
        )}
        <Slottable>{children}</Slottable>
        {!loading && TrailingIcon && <TrailingIcon className={iconClassName} aria-hidden="true" />}
      </Comp>
    );
  },
);

Button.displayName = "Button";
