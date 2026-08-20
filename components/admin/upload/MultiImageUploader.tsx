"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, PlusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { fileSchema } from "@/lib/validation";
import { buildStoragePath, extractStoragePath, removeFiles, uploadFile } from "@/lib/storage/upload";
import { describeUploadError } from "@/lib/storage/errors";
import { UploadProgress } from "./UploadProgress";
import { Button } from "@/components/admin/ui/button";

export interface MultiImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket: keyof typeof STORAGE_BUCKETS;
  recordId: string;
  label?: string;
  disabled?: boolean;
}

function SortableThumbnail({
  url,
  disabled,
  onRemove,
}: {
  url: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative size-24 overflow-hidden rounded-lg border border-border bg-surface",
        isDragging && "z-10 shadow-md",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- admin gallery preview only */}
      <img src={url} alt="" className="size-full object-cover" />

      <button
        type="button"
        disabled={disabled}
        className="absolute top-1 left-1 flex size-6 cursor-grab items-center justify-center rounded-md bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 active:cursor-grabbing disabled:hidden"
        aria-label="Reorder image"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-3.5" />
      </button>

      {!disabled ? (
        <Button
          type="button"
          variant="destructive"
          size="icon-xs"
          className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          onClick={onRemove}
          aria-label="Remove image"
        >
          <XIcon className="size-3" />
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Gallery variant of ImageUploader: multi-select + click, drag-to-reorder
 * (dnd-kit, same pattern AdminTable's row reordering uses), one upload per
 * selected file tracked independently so a slow upload doesn't block the
 * others from starting.
 */
export function MultiImageUploader({ value, onChange, bucket, recordId, label = "Gallery", disabled }: MultiImageUploaderProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  // Files upload one at a time (the loop below awaits each), so a single
  // name + percentage describes exactly what's happening — no need to track
  // a map of concurrent uploads.
  const [current, setCurrent] = useState<{ name: string; percent: number } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bucketConfig = STORAGE_BUCKETS[bucket];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const parsed = fileSchema(bucketConfig).safeParse(file);
      if (!parsed.success) {
        toast.error(`${file.name}: ${parsed.error.issues[0]?.message ?? "can't be used"}`);
        continue;
      }

      setUploadingCount((count) => count + 1);
      setCurrent({ name: file.name, percent: 0 });
      try {
        const path = buildStoragePath(recordId, file);
        const result = await uploadFile(bucketConfig.id, path, file, {
          onProgress: (percent) => setCurrent({ name: file.name, percent }),
        });
        onChange([...value, result.url]);
      } catch (error) {
        // Named per file: in a multi-file drop, "the upload didn't
        // complete" is useless without knowing which one.
        toast.error(`${file.name}: ${describeUploadError(error, bucketConfig)}`);
      } finally {
        setUploadingCount((count) => count - 1);
        setCurrent(null);
      }
    }
  }

  function handleRemove(url: string) {
    const path = extractStoragePath(url, bucketConfig.id);
    if (path) void removeFiles(bucketConfig.id, [path]);
    onChange(value.filter((existing) => existing !== url));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.indexOf(String(active.id));
    const newIndex = value.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    if (event.dataTransfer.files.length > 0) void handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-small font-medium text-foreground">{label}</p>

      <DndContext id="multi-image-uploader" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-3">
            {value.map((url) => (
              <SortableThumbnail key={url} url={url} disabled={disabled} onRemove={() => handleRemove(url)} />
            ))}

            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Add to ${label.toLowerCase()}`}
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
                "flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-surface text-center transition-colors",
                isDragActive && "border-accent bg-surface-raised",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {uploadingCount > 0 ? (
                <div className="relative flex size-full items-center justify-center">
                  <UploadProgress percent={current?.percent ?? 0} label={current?.name ?? "image"} />
                </div>
              ) : (
                <>
                  <PlusIcon className="size-5 text-foreground-muted" aria-hidden="true" />
                  <p className="px-1 text-caption text-foreground-muted">Add</p>
                </>
              )}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={inputRef}
        type="file"
        multiple
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
          // `event.target.files` is a *live* FileList tied to the input —
          // resetting `.value` below empties this same object in place
          // (confirmed live: capturing the FileList reference and later
          // clearing `.value` left `.length` at 0 by the time it was
          // checked), so `handleFiles` silently never ran. `Array.from`
          // copies out the actual File objects — stable, immutable blobs
          // unaffected by the input's own selection being cleared — before
          // that reset happens. Found live building Phase 20's
          // ProjectMediaManager, which copied this exact (broken) pattern.
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) void handleFiles(files);
        }}
      />
    </div>
  );
}
