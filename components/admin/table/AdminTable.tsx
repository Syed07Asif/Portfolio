"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CopyIcon, GripVerticalIcon, MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/shared";
import { Button } from "@/components/admin/ui/button";
import { Switch } from "@/components/admin/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
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

export interface AdminTableItem {
  id: string;
  display_order: number;
  /** Omit entirely for entities with no publish/draft concept (e.g. skill categories) — see AdminTableProps.onTogglePublished. */
  published?: boolean;
}

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

export interface AdminTableProps<T extends AdminTableItem> {
  items: T[];
  columns: AdminTableColumn<T>[];
  /** Singular, lowercase — used in toasts ("Education entry deleted") and the delete dialog's body copy. */
  entityName: string;
  /** What names the item in the delete confirmation dialog, e.g. `(item) => item.institution`. */
  getItemLabel: (item: T) => string;
  editHref: (item: T) => string;
  onReorder: (order: { id: string; display_order: number }[]) => Promise<ActionResult<unknown>>;
  /** Omit entirely for an entity with no publish/draft concept (skill categories, profile) — hides the Switch/Status column rather than rendering a toggle with nothing to toggle. */
  onTogglePublished?: (item: T, published: boolean) => Promise<ActionResult<unknown>>;
  /** The default "Delete {label}? This can't be undone" confirmation, used by every entity so far. Mutually exclusive with `onRequestDelete` below — provide exactly one. */
  onDelete?: (item: T) => Promise<ActionResult<unknown>>;
  /**
   * Escape hatch for an entity whose delete needs more than a yes/no
   * confirmation — e.g. skill categories, which must warn and offer a
   * choice (delete its skills, or move them elsewhere) when the category
   * still has skills. When provided, AdminTable's own confirmation dialog
   * never opens for this table; the row menu's "Delete" instead calls this
   * directly, and the caller owns its own dialog/flow (including calling
   * `router.refresh()` once it's done).
   */
  onRequestDelete?: (item: T) => void;
  onDuplicate?: (item: T) => Promise<ActionResult<unknown>>;
  emptyState: ReactNode;
}

function SortableRow<T extends AdminTableItem>({
  item,
  columns,
  entityName,
  editHref,
  pendingId,
  onTogglePublished,
  onDuplicate,
  onDeleteClick,
}: {
  item: T;
  columns: AdminTableColumn<T>[];
  entityName: string;
  editHref: string;
  pendingId: string | null;
  onTogglePublished?: (checked: boolean) => void;
  onDuplicate?: () => void;
  onDeleteClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const isRowPending = pendingId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0",
        isDragging && "relative z-10 bg-surface-raised shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-foreground-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Reorder ${entityName}`}
        disabled={isRowPending}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" aria-hidden="true" />
      </button>

      {columns.map((column) => (
        <div key={column.key} className={cn("min-w-0 flex-1 text-body text-foreground", column.className)}>
          {column.render(item)}
        </div>
      ))}

      <div className="flex shrink-0 items-center gap-3">
        {onTogglePublished ? (
          <Switch
            checked={Boolean(item.published)}
            onCheckedChange={onTogglePublished}
            disabled={isRowPending}
            aria-label={item.published ? `Unpublish ${entityName}` : `Publish ${entityName}`}
          />
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={isRowPending} aria-label="Row actions">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={editHref}>
                <PencilIcon className="size-4" /> Edit
              </Link>
            </DropdownMenuItem>
            {onDuplicate ? (
              <DropdownMenuItem onSelect={onDuplicate}>
                <CopyIcon className="size-4" /> Duplicate
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem variant="destructive" onSelect={onDeleteClick}>
              <TrashIcon className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * Generic, typed admin list: column config, publish toggle, row actions
 * (edit/duplicate/delete), drag-to-reorder, empty state, and a delete
 * confirmation naming the item. Every mutation is optimistic — local
 * `rows` state updates immediately, then rolls back to the pre-mutation
 * snapshot and shows an error toast if the server action fails.
 * `router.refresh()` after a *successful* mutation re-fetches the parent
 * Server Component's data, which re-syncs `rows` from real, canonical
 * data via the effect below (not just trusting the optimistic guess).
 */
export function AdminTable<T extends AdminTableItem>({
  items,
  columns,
  entityName,
  getItemLabel,
  editHref,
  onReorder,
  onTogglePublished,
  onDelete,
  onRequestDelete,
  onDuplicate,
  emptyState,
}: AdminTableProps<T>) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Re-sync local `rows` whenever the parent's canonical `items` change
  // (e.g. after router.refresh() following a mutation) — derived during
  // render (comparing against a mirrored previous value), not in an
  // effect, per React's guidance against synchronous setState-in-effect
  // (same pattern LoginForm and SlugField use elsewhere in this codebase).
  if (items !== prevItems) {
    setPrevItems(items);
    setRows(items);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleTogglePublished(item: T, published: boolean) {
    if (!onTogglePublished) return;
    const previous = rows;
    setPendingId(item.id);
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, published } : row)));

    const result = await onTogglePublished(item, published);

    setPendingId(null);
    if (!result.success) {
      setRows(previous);
      toast.error(result.error);
      return;
    }
    toast.success(published ? "Published." : "Unpublished.");
    router.refresh();
  }

  async function handleDuplicate(item: T) {
    if (!onDuplicate) return;
    setPendingId(item.id);
    const result = await onDuplicate(item);
    setPendingId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${entityName} duplicated.`);
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !onDelete) return;
    const previous = rows;
    setIsDeleting(true);
    setRows((current) => current.filter((row) => row.id !== deleteTarget.id));

    const result = await onDelete(deleteTarget);

    setIsDeleting(false);
    if (!result.success) {
      setRows(previous);
      toast.error(result.error);
      setDeleteTarget(null);
      return;
    }
    toast.success(`${entityName} deleted.`);
    setDeleteTarget(null);
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((row) => row.id === active.id);
    const newIndex = rows.findIndex((row) => row.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = rows;
    const reordered = arrayMove(rows, oldIndex, newIndex).map((row, index) => ({
      ...row,
      display_order: index,
    }));
    setRows(reordered);

    const result = await onReorder(reordered.map((row) => ({ id: row.id, display_order: row.display_order })));

    if (!result.success) {
      setRows(previous);
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-4 border-b border-border px-4 py-3 text-small font-medium text-foreground-muted">
          <span className="w-4 shrink-0" aria-hidden="true" />
          {columns.map((column) => (
            <span key={column.key} className={cn("min-w-0 flex-1", column.className)}>
              {column.header}
            </span>
          ))}
          {onTogglePublished ? <span className="shrink-0">Status</span> : null}
        </div>

        {/* `id` prop is required for SSR: without it, dnd-kit generates its
            screen-reader description id from a module-level counter that
            isn't guaranteed to match between the server and client render
            passes, producing a real (if non-fatal) hydration-mismatch
            warning on `aria-describedby` — confirmed live via the Next.js
            dev overlay while verifying this table, not just reasoned
            about. A fixed, unique-per-DndContext string sidesteps it. */}
        <DndContext id="admin-table" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
            {rows.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                columns={columns}
                entityName={entityName}
                editHref={editHref(item)}
                pendingId={pendingId}
                onTogglePublished={onTogglePublished ? (checked) => handleTogglePublished(item, checked) : undefined}
                onDuplicate={onDuplicate ? () => handleDuplicate(item) : undefined}
                onDeleteClick={() => (onRequestDelete ? onRequestDelete(item) : setDeleteTarget(item))}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Only AdminTable's own default confirmation ever opens this — an
          entity using `onRequestDelete` (skill categories) never sets
          `deleteTarget`, so this stays permanently closed for it and the
          caller's own dialog takes over entirely. */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget ? getItemLabel(deleteTarget) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this {entityName} and any files it owns. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
