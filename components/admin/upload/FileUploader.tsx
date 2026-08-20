"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { FileIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { fileSchema } from "@/lib/validation";
import { buildStoragePath, extractStoragePath, removeFiles, uploadFile } from "@/lib/storage/upload";
import { describeUploadError } from "@/lib/storage/errors";
import { UploadProgress } from "./UploadProgress";
import { Button } from "@/components/admin/ui/button";

export interface FileUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: keyof typeof STORAGE_BUCKETS;
  /** Folder name every upload for this record lives under — see ImageUploader's own doc comment for the create-vs-edit id shape. */
  recordId: string;
  label?: string;
  disabled?: boolean;
}

/** Best-effort readable filename from a Storage public URL — decodes and drops the uuid-prefixed path segments, keeping just the last one. */
function fileNameFromUrl(url: string): string {
  try {
    const decoded = decodeURIComponent(url);
    const last = decoded.split("/").pop();
    return last || decoded;
  } catch {
    return url;
  }
}

/**
 * Single-file drag/drop-or-click uploader for non-image documents (PDFs,
 * certificates) that may also be an image — unlike ImageUploader, this never
 * assumes the value can be rendered as an `<img>` (a PDF URL passed to one
 * shows a broken-image icon), so it shows a filename + "View" link instead
 * of a thumbnail. Same upload/remove mechanics as ImageUploader otherwise.
 */
export function FileUploader({ value, onChange, bucket, recordId, label = "File", disabled }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bucketConfig = STORAGE_BUCKETS[bucket];

  async function handleFile(file: File) {
    const parsed = fileSchema(bucketConfig).safeParse(file);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "That file can't be used.");
      return;
    }

    setProgress(0);
    setIsUploading(true);
    try {
      const path = buildStoragePath(recordId, file);
      const result = await uploadFile(bucketConfig.id, path, file, { onProgress: setProgress });
      onChange(result.url);
      toast.success("File uploaded.");
    } catch (error) {
      toast.error(describeUploadError(error, bucketConfig));
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    if (value) {
      const path = extractStoragePath(value, bucketConfig.id);
      if (path) void removeFiles(bucketConfig.id, [path]);
    }
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
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={disabled ? undefined : handleDrop}
        className={cn(
          "flex items-center gap-3 rounded-lg border-2 border-dashed border-border bg-surface p-4 transition-colors",
          isDragActive && "border-accent bg-surface-raised",
          disabled && "opacity-50",
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-raised text-foreground-muted">
          {isUploading ? (
            <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <FileIcon className="size-5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {value ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer noopener"
              className="block truncate text-small font-medium text-accent hover:underline"
            >
              {fileNameFromUrl(value)}
            </a>
          ) : (
            <p className="text-small text-foreground-muted">Drag & drop or click to upload</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            aria-label={value ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          >
            <UploadIcon className="size-4" />
          </Button>
          {value && !disabled ? (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={handleRemove}
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {isUploading ? <UploadProgress percent={progress} label={label} variant="inline" /> : null}

      <input
        ref={inputRef}
        type="file"
        accept={bucketConfig.allowedMimeTypes.join(",")}
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
