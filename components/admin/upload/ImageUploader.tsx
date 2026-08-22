"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { ImageOffIcon, UploadIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { fileSchema } from "@/lib/validation";
import { buildStoragePath, extractStoragePath, removeFiles, uploadFile } from "@/lib/storage/upload";
import { describeUploadError } from "@/lib/storage/errors";
import { UploadProgress } from "./UploadProgress";
import { Button } from "@/components/admin/ui/button";

export interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: keyof typeof STORAGE_BUCKETS;
  /** Folder name every upload for this record lives under — a real row id for an existing record, or a stable client-generated placeholder for one not yet created (see the entity form's own comment on how it produces this). */
  recordId: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Single-image drag/drop-or-click uploader. Shows real byte progress: the
 * spinner used to be indeterminate because `@supabase/storage-js` uploads
 * via `fetch`, which has no upload-progress event — Phase 23 moved
 * `uploadFile` onto `XMLHttpRequest` for exactly this, so the percentage
 * below is genuine, not a simulated animation.
 */
export function ImageUploader({ value, onChange, bucket, recordId, label = "Image", disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview ?? value;
  const bucketConfig = STORAGE_BUCKETS[bucket];

  async function handleFile(file: File) {
    const parsed = fileSchema(bucketConfig).safeParse(file);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "That file can't be used.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setProgress(0);
    setIsUploading(true);

    try {
      const path = buildStoragePath(recordId, file);
      const result = await uploadFile(bucketConfig.id, path, file, { onProgress: setProgress });
      onChange(result.url);
      toast.success("Image uploaded.");
    } catch (error) {
      // Rolls the preview back to whatever was saved before, so a failed
      // upload never leaves a picture on screen that isn't really stored.
      toast.error(describeUploadError(error, bucketConfig));
      setPreview(null);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }

  function handleRemove() {
    if (value) {
      const path = extractStoragePath(value, bucketConfig.id);
      if (path) void removeFiles(bucketConfig.id, [path]);
    }
    setPreview(null);
    onChange(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-small font-medium text-foreground">{label}</p>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={displayUrl ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={disabled ? undefined : handleDrop}
        className={cn(
          "relative flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed border-border bg-surface text-center transition-colors",
          isDragActive && "border-accent bg-surface-raised",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview only, may be a local blob: URL or an arbitrary Storage URL
          <img src={displayUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <ImageOffIcon className="size-6 text-foreground-muted" aria-hidden="true" />
            <p className="px-2 text-caption text-foreground-muted">Drag & drop or click</p>
          </>
        )}

        {isUploading ? <UploadProgress percent={progress} label={label} /> : null}

        {/*
          The overlay below carries `focus-within` as well as `hover`: it
          holds the Replace and Remove buttons, which stay focusable at
          `opacity-0`, so a keyboard user could tab straight onto a control
          they cannot see. On touch there is no hover state at all, which made
          them effectively unreachable. Phase 24 item 5 — nothing hover-only.
        */}
        {!isUploading && displayUrl && !disabled ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              aria-label={`Replace ${label.toLowerCase()}`}
            >
              <UploadIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={(event) => {
                event.stopPropagation();
                handleRemove();
              }}
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={bucketConfig.allowedMimeTypes.join(",")}
        // Hidden from both the tab order and the accessibility tree on
        // purpose. This input is a programmatic trigger — the visible Button
        // above calls `.click()` on it — so exposing it as well produced a
        // second, invisible tab stop for the same action *and* failed axe's
        // `label` rule (Phase 24 found both on /admin/projects/new).
        // `sr-only` only hides it visually; it stays focusable and
        // screen-reader-visible without these two attributes.
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
