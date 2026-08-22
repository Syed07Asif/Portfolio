"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, FileTextIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
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
import { StatusPill } from "@/components/admin/table/StatusPill";
import { RESUME_ROUTE } from "@/lib/constants";
import { formatAdminDate } from "@/lib/utils";
import { activateResume, deleteResume } from "@/lib/actions/resumes";
import type { AdminResume } from "@/lib/data/resumes";

export interface ResumeListProps {
  items: AdminResume[];
}

function CopyStableUrlButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}${RESUME_ROUTE}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Download URL copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically — copy it from the address bar instead.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      {copied ? "Copied" : "Copy stable download URL"}
    </Button>
  );
}

export function ResumeList({ items }: ResumeListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminResume | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleActivate(resume: AdminResume) {
    setPendingId(resume.id);
    const result = await activateResume(resume.id);
    setPendingId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${resume.version_label ?? "This version"}" is now active.`);
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteResume(deleteTarget.id);
    setIsDeleting(false);

    if (!result.success) {
      toast.error(result.error);
      setDeleteTarget(null);
      return;
    }
    toast.success("Resume deleted.");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-small font-medium text-foreground">Stable public download URL</p>
          <p className="text-caption text-foreground-muted">
            Always resolves to whichever version is active — safe to share anywhere, survives future uploads.
          </p>
        </div>
        <CopyStableUrlButton />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <FileTextIcon className="size-8 text-foreground-muted" aria-hidden="true" />
          <p className="text-body-lg font-medium text-foreground">No resumes uploaded yet</p>
          <p className="max-w-sm text-body text-foreground-muted">
            Upload a PDF above to make it downloadable from the public site.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-4 border-b border-border px-4 py-3 text-small font-medium text-foreground-muted">
            <span className="min-w-0 flex-1">Version</span>
            <span className="min-w-0 flex-1">Uploaded</span>
            <span className="shrink-0">Status</span>
            <span className="w-40 shrink-0 text-right">Actions</span>
          </div>
          {items.map((resume) => (
            <div
              key={resume.id}
              className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="min-w-0 flex-1 truncate text-body text-foreground">
                {resume.version_label || "Untitled version"}
              </span>
              <span className="min-w-0 flex-1 text-body text-foreground-muted">
                {formatAdminDate(resume.uploaded_at)}
              </span>
              <span className="shrink-0">
                <StatusPill published={resume.is_active} />
              </span>
              <span className="flex w-40 shrink-0 items-center justify-end gap-2">
                {!resume.is_active ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pendingId === resume.id}
                    onClick={() => handleActivate(resume)}
                  >
                    Set active
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={resume.is_active}
                  title={resume.is_active ? "Activate a different version first" : "Delete"}
                  aria-label={`Delete ${resume.version_label || "this resume"}`}
                  onClick={() => setDeleteTarget(resume)}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.version_label || "this resume"}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes this file. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={handleConfirmDelete}>
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
