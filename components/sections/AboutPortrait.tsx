"use client";

import Image from "next/image";
import { useState } from "react";

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
}

export interface AboutPortraitProps {
  src: string | null;
  name: string;
}

/**
 * Large square portrait for the About section. Deliberately not
 * components/ui/Avatar — Avatar is a small circular identity marker for
 * compact contexts (nav, lists) and always renders `unoptimized` since that
 * costs nothing noticeable at avatar sizes; this needs real next/image
 * responsive loading (`sizes`) at a much larger, prominent size, so it's
 * its own component rather than stretching Avatar to cover both jobs.
 *
 * Never renders a broken image or an empty box: falls back to a
 * centered-initials tile — same fallback *idea* as Avatar, sized for this
 * slot — whenever `src` is null, and also `onError` if the URL is set but
 * the image genuinely fails to load. That second path isn't hypothetical:
 * the seed's avatar_url points at a file that doesn't exist on disk yet, so
 * it's exercised for real today, not just defensively.
 *
 * `next.config.ts` has no `images.remotePatterns` configured yet, so this
 * only works for same-origin/relative URLs (true of the current seed data)
 * — a remote Supabase Storage URL would need that config added first, same
 * caveat Avatar's own fallback comment already notes.
 */
export function AboutPortrait({ src, name }: AboutPortraitProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface-raised">
      {showFallback ? (
        <div role="img" aria-label={name} className="flex size-full items-center justify-center">
          <span aria-hidden="true" className="text-display font-display font-bold text-foreground-muted">
            {initialsFrom(name)}
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt={`Portrait of ${name}`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 384px, 100vw"
          priority={false}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
    </div>
  );
}
