import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * Max-width wrapper used inside Section (and anywhere else content needs
 * the same horizontal measure without the section's vertical rhythm/reveal
 * behaviour). Horizontal padding scales up at wider breakpoints rather than
 * using tokens.css's single static `--space-container-x` value, which is
 * why it's implemented with Tailwind's numeric spacing scale instead.
 */
export function Container({ className, children, ...props }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12", className)} {...props}>
      {children}
    </div>
  );
}
