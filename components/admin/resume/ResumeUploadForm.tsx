"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Switch } from "@/components/admin/ui/switch";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { resumeFileSchema } from "@/lib/validation";
import { buildStoragePath, extractStoragePath, uploadFile } from "@/lib/storage/upload";
import { createResume } from "@/lib/actions/resumes";

/**
 * A resume upload is a smaller, one-off shape than the standard entity
 * form (a file, a version label, and an "activate now" switch — no other
 * fields, no edit page), so this is a plain client component rather than
 * useAdminForm/AdminFormShell: the file must actually finish uploading to
 * Storage before there's a file_url to create the row with at all, the same
 * upload-then-associate order ImageUploader already uses elsewhere, just
 * without a surrounding react-hook-form-managed entity form.
 */
export function ResumeUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [activateNow, setActivateNow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(selected: File | null) {
    if (!selected) {
      setFile(null);
      return;
    }
    const parsed = resumeFileSchema.safeParse(selected);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "That file can't be used.");
      return;
    }
    setFile(selected);
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Choose a PDF to upload first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const recordId = crypto.randomUUID();
      const path = buildStoragePath(recordId, file);
      const uploaded = await uploadFile(STORAGE_BUCKETS.resume.id, path, file);

      // The same `recordId` the file was just uploaded under becomes the
      // row's primary key, so `resume/{id}/` is the folder this row owns
      // from the first byte — see resolveNewRecordId in lib/actions/shared.ts.
      const result = await createResume(recordId, {
        file_url: uploaded.url,
        storage_path: extractStoragePath(uploaded.url, STORAGE_BUCKETS.resume.id),
        version_label: versionLabel.trim() || null,
        is_active: activateNow,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(activateNow ? "Resume uploaded and activated." : "Resume uploaded.");
      setFile(null);
      setVersionLabel("");
      setActivateNow(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-body-lg font-semibold text-foreground">Upload a new version</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="resume-file" className="text-small font-medium text-foreground">
          PDF file
        </label>
        <Input
          id="resume-file"
          type="file"
          accept="application/pdf"
          disabled={isSubmitting}
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
        />
        <p className="text-caption text-foreground-muted">
          PDF only, up to {Math.round(STORAGE_BUCKETS.resume.maxSizeBytes / (1024 * 1024))}MB.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="resume-version-label" className="text-small font-medium text-foreground">
          Version label
        </label>
        <Input
          id="resume-version-label"
          value={versionLabel}
          onChange={(event) => setVersionLabel(event.target.value)}
          placeholder="e.g. v3 — 2026"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={activateNow} onCheckedChange={setActivateNow} disabled={isSubmitting} id="resume-activate-now" />
        <label htmlFor="resume-activate-now" className="text-small text-foreground">
          Set as active immediately
        </label>
      </div>

      <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !file} className="self-start">
        {isSubmitting ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <UploadIcon />}
        {isSubmitting ? "Uploading…" : "Upload"}
      </Button>
    </div>
  );
}
