"use client";

import Image from "next/image";
import { useState } from "react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
}

export interface ProjectCardImageProps {
  src: string | null;
  name: string;
  /** Overrides the default full-width grid-card sizing — e.g. a fixed `size-24` for the detail page header. */
  className?: string;
  /** Matches whatever `className` actually renders at — defaults to the grid card's own responsive width. */
  sizes?: string;
  /** True for the one copy of this that's above the fold today (the detail page header) — everywhere else stays lazy. */
  priority?: boolean;
}

const DEFAULT_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * A project's logo, square (a logo mark, not a wide screenshot;
 * `cover_image_url` is a different asset, not used here) — the primary
 * visual on both `ProjectCard` (grid) and the detail page header, just at
 * different sizes via `className`. Skeleton while the lazy-loaded image is
 * in flight, falling back to a centered-initials tile — never a broken
 * image or an empty box — when `src` is null or the load genuinely fails.
 * The `group-hover`/`group-focus-visible` scale (the grid card supplies
 * the `group` class; the header doesn't, so it's simply inert there) is a
 * `transform` only, inside a fixed-`aspect-square` box, so it never shifts
 * layout.
 */
export function ProjectCardImage({ src, name, className, sizes, priority = false }: ProjectCardImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");
  const showFallback = !src || status === "error";

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-raised",
        className,
      )}
    >
      {showFallback ? (
        <div role="img" aria-label={name} className="flex size-full items-center justify-center">
          <span aria-hidden="true" className="text-h2 font-display font-bold text-foreground-muted">
            {initialsFrom(name)}
          </span>
        </div>
      ) : (
        <>
          {status === "loading" ? (
            <Skeleton shape="rect" className="absolute inset-0 size-full rounded-none" />
          ) : null}
          <Image
            src={src}
            alt={`${name} logo`}
            fill
            sizes={sizes ?? DEFAULT_SIZES}
            loading={priority ? undefined : "lazy"}
            priority={priority}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            className={cn(
              "object-cover transition-transform duration-slow ease-out-expo group-hover:scale-105 group-focus-visible:scale-105",
              status === "loading" ? "opacity-0" : "opacity-100",
            )}
          />
        </>
      )}
    </div>
  );
}
