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
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangleIcon,
  FileIcon,
  GripVerticalIcon,
  Loader2Icon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { projectMediaFileSchema, type ProjectMediaFormItem } from "@/lib/validation";
import type { MediaType } from "@/types/content";
import { buildStoragePath, extractStoragePath, removeFiles, uploadFile } from "@/lib/storage/upload";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";

export interface ProjectMediaManagerProps {
  value: ProjectMediaFormItem[];
  onChange: (value: ProjectMediaFormItem[]) => void;
  recordId: string;
  disabled?: boolean;
}

const MEDIA_TYPE_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "image", label: "Screenshot" },
  { value: "diagram", label: "Diagram" },
  { value: "gif", label: "Animation (GIF)" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
];

function defaultMediaTypeForFile(file: File): MediaType {
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function MediaPreview({ item }: { item: ProjectMediaFormItem }) {
  if (item.media_type === "video") {
    return <video src={item.file_url} preload="metadata" muted playsInline className="size-full object-cover" />;
  }
  if (item.media_type === "document") {
    return (
      <div className="flex size-full items-center justify-center bg-surface-raised">
        <FileIcon className="size-6 text-foreground-muted" aria-hidden="true" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- admin gallery preview only, arbitrary Storage URL
  return <img src={item.file_url} alt="" className="size-full object-cover" />;
}

function SortableMediaRow({
  item,
  index,
  disabled,
  onUpdate,
  onRemove,
}: {
  item: ProjectMediaFormItem;
  index: number;
  disabled?: boolean;
  onUpdate: (patch: Partial<ProjectMediaFormItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.file_url });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <div className="flex shrink-0 items-start gap-2">
        <button
          type="button"
          disabled={disabled}
          className="mt-1 cursor-grab touch-none text-foreground-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Reorder item ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" aria-hidden="true" />
        </button>
        <div className="size-20 shrink-0 overflow-hidden rounded-md border border-border">
          <MediaPreview item={item} />
        </div>
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-medium text-foreground-muted">Type</label>
          <Select value={item.media_type} onValueChange={(mediaType: MediaType) => onUpdate({ media_type: mediaType })} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-medium text-foreground-muted">Title</label>
          <Input value={item.title ?? ""} onChange={(event) => onUpdate({ title: event.target.value })} disabled={disabled} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-medium text-foreground-muted">Alt text</label>
          <Input value={item.alt_text ?? ""} onChange={(event) => onUpdate({ alt_text: event.target.value })} disabled={disabled} />
          {!item.alt_text?.trim() ? (
            <p className="flex items-center gap-1 text-caption text-warning">
              <AlertTriangleIcon className="size-3" aria-hidden="true" />
              Missing alt text — affects accessibility and SEO.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-medium text-foreground-muted">Caption</label>
          <Textarea
            value={item.caption ?? ""}
            onChange={(event) => onUpdate({ caption: event.target.value })}
            disabled={disabled}
            rows={1}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={onRemove}
        aria-label="Delete this item"
        className="self-start"
      >
        <TrashIcon className="size-4" />
      </Button>
    </div>
  );
}

/**
 * Project gallery manager — richer than `MultiImageUploader` (which is
 * just an ordered array of URLs) because `project_media` rows carry real
 * per-item metadata (`media_type`, `title`, `alt_text`, `caption`), so a
 * plain array-of-strings uploader can't represent this entity. Built from
 * the same primitives `ImageUploader`/`MultiImageUploader` already proved
 * live — `uploadFile`/`removeFiles`/`buildStoragePath` from
 * lib/storage/upload.ts, the dnd-kit reorder pattern with a fixed
 * `DndContext` id for SSR-safe hydration (see docs/content-management.md's
 * "Known gaps" — this is the first entity to actually exercise a gallery
 * field end to end).
 */
export function ProjectMediaManager({ value, onChange, recordId, disabled }: ProjectMediaManagerProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bucketConfig = STORAGE_BUCKETS.projects;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const parsed = projectMediaFileSchema.safeParse(file);
      if (!parsed.success) {
        toast.error(`${file.name}: ${parsed.error.issues[0]?.message ?? "can't be used"}`);
        continue;
      }

      setUploadingCount((count) => count + 1);
      try {
        const path = buildStoragePath(recordId, file);
        const result = await uploadFile(bucketConfig.id, path, file);
        onChange([
          ...value,
          {
            file_url: result.url,
            storage_path: result.path,
            media_type: defaultMediaTypeForFile(file),
            title: null,
            alt_text: null,
            caption: null,
          },
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `${file.name}: upload failed.`);
      } finally {
        setUploadingCount((count) => count - 1);
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    if (event.dataTransfer.files.length > 0) void handleFiles(event.dataTransfer.files);
  }

  function handleUpdate(index: number, patch: Partial<ProjectMediaFormItem>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleConfirmRemove() {
    if (deleteIndex === null) return;
    const target = value[deleteIndex];
    if (target?.storage_path) {
      void removeFiles(bucketConfig.id, [target.storage_path]);
    } else if (target?.file_url) {
      const path = extractStoragePath(target.file_url, bucketConfig.id);
      if (path) void removeFiles(bucketConfig.id, [path]);
    }
    onChange(value.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((item) => item.file_url === active.id);
    const newIndex = value.findIndex((item) => item.file_url === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small font-medium text-foreground">Gallery</p>

      {value.length > 0 ? (
        <DndContext id="project-media-manager" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map((item) => item.file_url)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {value.map((item, index) => (
                <SortableMediaRow
                  key={item.file_url}
                  item={item}
                  index={index}
                  disabled={disabled}
                  onUpdate={(patch) => handleUpdate(index, patch)}
                  onRemove={() => setDeleteIndex(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Add gallery files"
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
          "flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-surface text-center transition-colors",
          isDragActive && "border-accent bg-surface-raised",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {uploadingCount > 0 ? (
          <>
            <Loader2Icon className="size-5 animate-spin text-foreground-muted" aria-hidden="true" />
            <p className="text-caption text-foreground-muted">Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}…</p>
          </>
        ) : (
          <>
            <UploadIcon className="size-5 text-foreground-muted" aria-hidden="true" />
            <p className="text-caption text-foreground-muted">Drag & drop screenshots, videos, or documents — or click to browse</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={bucketConfig.allowedMimeTypes.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          // `event.target.files` is a *live* FileList tied to the input —
          // resetting `.value` below empties this same object in place, so
          // capturing the FileList reference (rather than the actual File
          // objects) here left `handleFiles` silently never running —
          // confirmed live, no error, no toast, no upload, `.length` at 0
          // by the time it was checked. `Array.from` copies out the actual
          // File objects, stable and unaffected by the input's own
          // selection being cleared, before that reset happens.
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) void handleFiles(files);
        }}
      />

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this gallery item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the file from storage as well as the gallery. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmRemove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
