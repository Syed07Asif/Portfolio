import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SkeletonShape = "text" | "circle" | "rect";

const shapeClassName: Record<SkeletonShape, string> = {
  text: "h-4 w-full rounded-sm",
  circle: "size-10 rounded-full",
  rect: "h-32 w-full rounded-lg",
};

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
}

/**
 * A single shimmering placeholder shape. Compose several to match real
 * content layout — e.g. a project card skeleton is
 * `<Skeleton shape="rect" /> <Skeleton shape="text" className="w-3/4" /> <Skeleton shape="text" className="w-1/2" />`.
 *
 * `motion-safe:animate-pulse`, not a bare `animate-pulse`: this was the one
 * animation on the whole site that ignored `prefers-reduced-motion` (Phase
 * 24's reduced-motion pass found it by reading computed `animationName` on
 * every element with the setting on). It matters more than most, because a
 * skeleton pulses *indefinitely* while content loads, and a failed image —
 * such as the seeded avatar placeholder that does not exist — leaves it
 * pulsing forever. Without the animation the placeholder is a static block,
 * which still reads as "loading" perfectly well.
 */
export function Skeleton({ shape = "rect", className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse bg-surface-raised", shapeClassName[shape], className)}
      {...props}
    />
  );
}
