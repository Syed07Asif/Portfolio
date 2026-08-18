"use client";

import Image from "next/image";
import { Award } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface AchievementThumbnailProps {
  src: string | null;
  title: string;
}

/**
 * Small square visual for one achievement — a real image when image_url is
 * set, a centered Award icon tile otherwise. Same "never blank, never a
 * broken-image icon" contract as ProjectCardImage/AboutPortrait, just sized
 * for a compact list row instead of a grid card, which is why it's its own
 * component rather than reusing either of those.
 */
export function AchievementThumbnail({ src, title }: AchievementThumbnailProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");
  const showFallback = !src || status === "error";

  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-raised sm:size-20">
      {showFallback ? (
        <div role="img" aria-label={title} className="flex size-full items-center justify-center">
          <Award className="size-6 text-foreground-muted" aria-hidden="true" />
        </div>
      ) : (
        <Image
          src={src!}
          alt=""
          fill
          sizes="80px"
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn("object-cover", status === "loading" ? "opacity-0" : "opacity-100")}
        />
      )}
    </div>
  );
}
