"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { DateField, NumberField, SwitchField, TagInputField, TextField, TextareaField } from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { experienceSchema, type ExperienceInput } from "@/lib/validation";
import { createExperience, updateExperience } from "@/lib/actions/experience";
import { formatDuration } from "@/lib/utils";
import type { AdminExperience } from "@/lib/data/experience";

export interface ExperienceFormProps {
  /** Omitted for the create form. */
  experience?: AdminExperience;
  defaultDisplayOrder: number;
}

export function ExperienceForm({ experience, defaultDisplayOrder }: ExperienceFormProps) {
  // Stable folder name for the logo uploader before the row exists — same
  // pattern EducationForm uses (see that file's comment).
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = experience?.id ?? newRecordId;

  const defaultValues: ExperienceInput = {
    company: experience?.company ?? "",
    role: experience?.role ?? "",
    company_logo_url: experience?.company_logo_url ?? null,
    location: experience?.location ?? "",
    employment_type: experience?.employment_type ?? "",
    start_date: experience?.start_date ?? "",
    end_date: experience?.end_date ?? null,
    is_current: experience?.is_current ?? false,
    description: experience?.description ?? "",
    responsibilities: experience?.responsibilities ?? [],
    technologies: experience?.technologies ?? [],
    link_url: experience?.link_url ?? null,
    display_order: experience?.display_order ?? defaultDisplayOrder,
    published: experience?.published ?? false,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: experienceSchema,
    defaultValues,
    onSubmit: (values) => (experience ? updateExperience(experience.id, values) : createExperience(values)),
    successMessage: experience ? "Experience entry updated." : "Experience entry created.",
    redirectTo: "/admin/experience",
  });

  const isCurrent = form.watch("is_current");
  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");

  // Clearing end_date the instant is_current flips on — adjusted during
  // render (comparing against a mirrored previous value), not in an
  // effect, per React's guidance against synchronous setState-in-effect
  // (same pattern AdminTable/SlugField/LoginForm already use elsewhere in
  // this codebase). Mirrors the database's own
  // experience_current_has_no_end_date check constraint, just proactively
  // instead of waiting for a validation error.
  const [prevIsCurrent, setPrevIsCurrent] = useState(isCurrent);
  if (isCurrent !== prevIsCurrent) {
    setPrevIsCurrent(isCurrent);
    if (isCurrent) form.setValue("end_date", null, { shouldDirty: true, shouldValidate: true });
  }

  const durationPreview = startDate ? formatDuration(startDate, endDate ?? null, isCurrent) : null;

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={experience ? "Save changes" : "Create"}
      cancelHref="/admin/experience"
    >
      <ImageUploader
        label="Company logo"
        bucket="experience"
        recordId={recordId}
        value={form.watch("company_logo_url")}
        onChange={(url) => form.setValue("company_logo_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="company" label="Company" />
        <TextField control={form.control} name="role" label="Role" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="location" label="Location" />
        <TextField control={form.control} name="employment_type" label="Employment type" placeholder="e.g. Full-time" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <DateField control={form.control} name="start_date" label="Start date" disabled={isPending} />
        <DateField
          control={form.control}
          name="end_date"
          label="End date"
          disabled={isPending || isCurrent}
          description={isCurrent ? "Cleared automatically while this is your current role." : undefined}
        />
      </div>

      <SwitchField
        control={form.control}
        name="is_current"
        label="Current role"
        description="Shows as “Present” on the public timeline instead of an end date."
      />

      {durationPreview ? (
        <p className="text-small text-foreground-muted">
          Duration shown on the public site: <span className="font-medium text-foreground">{durationPreview}</span>
        </p>
      ) : null}

      <TextareaField control={form.control} name="description" label="Description" rows={5} />

      <TagInputField
        control={form.control}
        name="responsibilities"
        label="Responsibilities"
        placeholder="Type one, press Enter"
        description="Each entry renders as its own line on the public timeline card."
      />

      <TagInputField
        control={form.control}
        name="technologies"
        label="Technologies"
        placeholder="Type one, press Enter"
      />

      <TextField control={form.control} name="link_url" label="Link URL" type="url" />

      <NumberField control={form.control} name="display_order" label="Display order" min={0} />

      <SwitchField
        control={form.control}
        name="published"
        label="Published"
        description="Visible on the public site's Experience timeline."
      />
    </AdminFormShell>
  );
}
