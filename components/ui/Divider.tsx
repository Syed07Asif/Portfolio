import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface DividerProps extends HTMLAttributes<HTMLHRElement | HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

/**
 * A single hairline rule. Renders <hr> for horizontal (semantically a
 * thematic break) and a <div role="separator"> for vertical (no vertical
 * equivalent of <hr> exists).
 */
export function Divider({ orientation = "horizontal", className, ...props }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("h-full w-px self-stretch bg-border", className)}
        {...props}
      />
    );
  }

  return <hr className={cn("w-full border-t border-border", className)} {...props} />;
}
