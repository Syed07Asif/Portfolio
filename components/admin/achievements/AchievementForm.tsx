"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { DateField, NumberField, SwitchField, TextField, TextareaField } from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { FileUploader } from "@/components/admin/upload/FileUploader";
import { achievementSchema, type AchievementInput } from "@/lib/validation";
import { createAchievement, updateAchievement } from "@/lib/actions/achievements";
import type { AdminAchievement } from "@/lib/data/achievements";

export interface AchievementFormProps {
  /** Omitted for the create form. */
  achievement?: AdminAchievement;
  /** Where a new row lands in the list by default — the caller computes "append at the end" from the current row count. */
  defaultDisplayOrder: number;
}

export function AchievementForm({ achievement, defaultDisplayOrder }: AchievementFormProps) {
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = achievement?.id ?? newRecordId;

  const defaultValues: AchievementInput = {
    title: achievement?.title ?? "",
    description: achievement?.description ?? "",
    date: achievement?.date ?? null,
    organization: achievement?.organization ?? "",
    image_url: achievement?.image_url ?? null,
    document_url: achievement?.document_url ?? null,
    external_link: achievement?.external_link ?? null,
    display_order: achievement?.display_order ?? defaultDisplayOrder,
    published: achievement?.published ?? false,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: achievementSchema,
    defaultValues,
    onSubmit: (values) => (achievement ? updateAchievement(achievement.id, values) : createAchievement(values)),
    successMessage: achievement ? "Achievement updated." : "Achievement created.",
    redirectTo: "/admin/achievements",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={achievement ? "Save changes" : "Create"}
      cancelHref="/admin/achievements"
    >
      <ImageUploader
        label="Image"
        bucket="achievements"
        recordId={recordId}
        value={form.watch("image_url")}
        onChange={(url) => form.setValue("image_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <TextField control={form.control} name="title" label="Title" />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="organization" label="Organization" />
        <DateField control={form.control} name="date" label="Date" />
      </div>

      <TextareaField control={form.control} name="description" label="Description" rows={4} />

      <FileUploader
        label="Supporting document"
        bucket="achievements"
        recordId={recordId}
        value={form.watch("document_url")}
        onChange={(url) => form.setValue("document_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <TextField control={form.control} name="external_link" label="External link" type="url" />

      <NumberField control={form.control} name="display_order" label="Display order" min={0} />

      <SwitchField
        control={form.control}
        name="published"
        label="Published"
        description="Visible on the public site's Achievements section."
      />
    </AdminFormShell>
  );
}
