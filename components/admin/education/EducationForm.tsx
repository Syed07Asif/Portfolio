"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { DateField, NumberField, SwitchField, TextField, TextareaField } from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { educationSchema, type EducationInput } from "@/lib/validation";
import { createEducation, updateEducation } from "@/lib/actions/education";
import type { AdminEducation } from "@/lib/data/education";

export interface EducationFormProps {
  /** Omitted for the create form. */
  education?: AdminEducation;
  /** Where a new row lands in the list by default — the caller (the `new/page.tsx` route) computes "append at the end" from the current row count. */
  defaultDisplayOrder: number;
}

export function EducationForm({ education, defaultDisplayOrder }: EducationFormProps) {
  // A stable folder name for the logo uploader before the row exists —
  // ImageUploader needs somewhere to put a file the admin drops in before
  // hitting Submit. Once created, the real row id (`education.id`) takes
  // over on the next edit.
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = education?.id ?? newRecordId;

  const defaultValues: EducationInput = {
    institution: education?.institution ?? "",
    degree: education?.degree ?? "",
    field_of_study: education?.field_of_study ?? "",
    institution_logo_url: education?.institution_logo_url ?? null,
    start_date: education?.start_date ?? null,
    end_date: education?.end_date ?? null,
    grade: education?.grade ?? "",
    description: education?.description ?? "",
    link_url: education?.link_url ?? null,
    display_order: education?.display_order ?? defaultDisplayOrder,
    published: education?.published ?? false,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: educationSchema,
    defaultValues,
    onSubmit: (values) => (education ? updateEducation(education.id, values) : createEducation(recordId, values)),
    successMessage: education ? "Education entry updated." : "Education entry created.",
    redirectTo: "/admin/education",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={education ? "Save changes" : "Create"}
      cancelHref="/admin/education"
    >
      <ImageUploader
        label="Institution logo"
        bucket="education"
        recordId={recordId}
        value={form.watch("institution_logo_url")}
        onChange={(url) => form.setValue("institution_logo_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="institution" label="Institution" />
        <TextField control={form.control} name="degree" label="Degree" />
      </div>

      <TextField control={form.control} name="field_of_study" label="Field of study" />

      <div className="grid gap-6 sm:grid-cols-2">
        <DateField control={form.control} name="start_date" label="Start date" />
        <DateField control={form.control} name="end_date" label="End date" />
      </div>

      <TextField control={form.control} name="grade" label="Grade" />

      <TextareaField control={form.control} name="description" label="Description" rows={5} />

      <TextField control={form.control} name="link_url" label="Link URL" type="url" />

      <NumberField control={form.control} name="display_order" label="Display order" min={0} />

      <SwitchField
        control={form.control}
        name="published"
        label="Published"
        description="Visible on the public site's Education section."
      />
    </AdminFormShell>
  );
}
