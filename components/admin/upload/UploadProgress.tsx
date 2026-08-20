"use client";

import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadProgressProps {
  /** 0-100, from `uploadFile`'s `onProgress`. */
  percent: number;
  /** What's being uploaded, e.g. "Cover image" — used for the accessible name. */
  label: string;
  /**
   * `overlay` covers a fixed-size preview tile (ImageUploader,
   * MultiImageUploader); `inline` is a bar that sits under a full-width row
   * (FileUploader), where an overlay would have nothing square to cover.
   */
  variant?: "overlay" | "inline";
  className?: string;
}

/**
 * Determinate upload progress. Real bytes, not an animation: `uploadFile`
 * reports `xhr.upload.onprogress` events (see lib/storage/upload.ts for why
 * that meant moving off `@supabase/storage-js`'s fetch-based upload).
 *
 * A spinner is kept alongside the bar deliberately. Progress reaching 100%
 * means the *bytes* have been sent, not that Storage has finished writing
 * and replied — on a fast connection the bar fills almost instantly and
 * then waits, and a bar sitting at 100% with nothing else moving reads as
 * "stuck". The spinner is what says "still working".
 */
export function UploadProgress({ percent, label, variant = "overlay", className }: UploadProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  const bar = (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={`Uploading ${label.toLowerCase()}`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-fast ease-out-quart"
        // Inline width is the value itself, not a style decision — there is
        // no token for "37 percent", and a class per percentage isn't a
        // thing. Every colour and radius above is still token-driven.
        style={{ width: `${clamped}%` }}
      />
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {bar}
        <p className="text-caption text-foreground-muted">Uploading… {clamped}%</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 px-4",
        className,
      )}
    >
      <Loader2Icon className="size-5 animate-spin text-foreground" aria-hidden="true" />
      <span className="text-caption font-medium text-foreground">{clamped}%</span>
      {bar}
    </div>
  );
}
