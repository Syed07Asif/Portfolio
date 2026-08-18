"use client";

import Image from "next/image";
import { FileText, ImageOff, Play } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ProjectMedia } from "@/types/content";

export interface MediaThumbnailProps {
  media: ProjectMedia;
  /** Pre-resolved via resolveMediaLabel — this component doesn't know its position in any particular list. */
  label: string;
  /** Matches the grid's own responsive column count so next/image requests a small derivative, not the full-resolution original. */
  sizes: string;
  /** Present for openable media (image/video/gif/diagram) — absent for documents, which render as a download link instead of a lightbox trigger. */
  onOpen?: () => void;
}

const TILE_CLASSNAME =
  "relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * One grid cell. Three distinct render paths, not one generic "media"
 * renderer, because the requirements genuinely differ per type: gifs must
 * bypass next/image (its optimizer would flatten the animation to a single
 * frame), videos need a play-badge affordance since a still frame alone
 * doesn't read as playable, and documents aren't openable at all — they're
 * a download link, never wired into the lightbox's index.
 */
export function MediaThumbnail({ media, label, sizes, onOpen }: MediaThumbnailProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    media.media_type === "image" || media.media_type === "diagram" ? "loading" : "loaded",
  );

  if (media.media_type === "document") {
    return (
      <a
        href={media.file_url}
        download
        aria-label={`Download ${label}`}
        className={cn(
          TILE_CLASSNAME,
          "flex flex-col items-center justify-center gap-2 p-4 text-center transition-colors duration-fast ease-out-quart hover:border-border-strong",
        )}
      >
        <FileText className="size-8 text-foreground-muted" aria-hidden="true" />
        <span className="line-clamp-2 text-small font-medium text-foreground">{label}</span>
      </a>
    );
  }

  const showFallback = status === "error";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${label}`}
      className={cn(TILE_CLASSNAME, "group cursor-pointer")}
    >
      {showFallback ? (
        <div className="flex size-full items-center justify-center">
          <ImageOff className="size-6 text-foreground-muted" aria-hidden="true" />
        </div>
      ) : (
        <>
          {media.media_type === "gif" ? (
            // eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer would strip the animation; a plain <img> preserves it.
            <img
              src={media.file_url}
              alt=""
              loading="lazy"
              onError={() => setStatus("error")}
              className="absolute inset-0 size-full object-cover transition-transform duration-slow ease-out-expo group-hover:scale-105 group-focus-visible:scale-105"
            />
          ) : media.media_type === "video" ? (
            <video
              src={media.file_url}
              preload="metadata"
              muted
              playsInline
              aria-hidden="true"
              onError={() => setStatus("error")}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <>
              {status === "loading" ? (
                <Skeleton shape="rect" className="absolute inset-0 size-full rounded-none" />
              ) : null}
              <Image
                src={media.file_url}
                alt=""
                fill
                sizes={sizes}
                loading="lazy"
                onLoad={() => setStatus("loaded")}
                onError={() => setStatus("error")}
                className={cn(
                  "object-cover transition-transform duration-slow ease-out-expo group-hover:scale-105 group-focus-visible:scale-105",
                  status === "loading" ? "opacity-0" : "opacity-100",
                )}
              />
            </>
          )}

          {media.media_type === "video" ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/30">
              <span className="flex size-10 items-center justify-center rounded-full bg-background/70 text-foreground">
                <Play className="size-4 translate-x-0.5" aria-hidden="true" fill="currentColor" />
              </span>
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}
