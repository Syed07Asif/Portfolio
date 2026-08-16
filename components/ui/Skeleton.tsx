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
 */
export function Skeleton({ shape = "rect", className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse bg-surface-raised", shapeClassName[shape], className)}
      {...props}
    />
  );
}
