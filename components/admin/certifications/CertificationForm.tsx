"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { DateField, NumberField, SwitchField, TextField, TextareaField } from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { FileUploader } from "@/components/admin/upload/FileUploader";
import { certificationSchema, type CertificationInput } from "@/lib/validation";
import { createCertification, updateCertification } from "@/lib/actions/certifications";
import type { AdminCertification } from "@/lib/data/certifications";

export interface CertificationFormProps {
  /** Omitted for the create form. */
  certification?: AdminCertification;
  /** Where a new row lands in the list by default — the caller computes "append at the end" from the current row count. */
  defaultDisplayOrder: number;
}

export function CertificationForm({ certification, defaultDisplayOrder }: CertificationFormProps) {
  // A stable folder name for uploads before the row exists — see
  // EducationForm's identical comment for why.
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = certification?.id ?? newRecordId;

  const defaultValues: CertificationInput = {
    name: certification?.name ?? "",
    issuing_organization: certification?.issuing_organization ?? "",
    organization_logo_url: certification?.organization_logo_url ?? null,
    issue_date: certification?.issue_date ?? null,
    expiration_date: certification?.expiration_date ?? null,
    credential_id: certification?.credential_id ?? "",
    credential_url: certification?.credential_url ?? null,
    certificate_file_url: certification?.certificate_file_url ?? null,
    description: certification?.description ?? "",
    display_order: certification?.display_order ?? defaultDisplayOrder,
    published: certification?.published ?? false,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: certificationSchema,
    defaultValues,
    onSubmit: (values) => (certification ? updateCertification(certification.id, values) : createCertification(recordId, values)),
    successMessage: certification ? "Certification updated." : "Certification created.",
    redirectTo: "/admin/certifications",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={certification ? "Save changes" : "Create"}
      cancelHref="/admin/certifications"
    >
      <ImageUploader
        label="Issuing organization logo"
        bucket="certifications"
        recordId={recordId}
        value={form.watch("organization_logo_url")}
        onChange={(url) => form.setValue("organization_logo_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="name" label="Certification name" />
        <TextField control={form.control} name="issuing_organization" label="Issuing organization" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <DateField control={form.control} name="issue_date" label="Issue date" />
        <DateField control={form.control} name="expiration_date" label="Expiration date" description="Leave blank if it doesn't expire." />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="credential_id" label="Credential ID" />
        <TextField control={form.control} name="credential_url" label="Credential verification URL" type="url" />
      </div>

      <FileUploader
        label="Certificate (PDF or image)"
        bucket="certifications"
        recordId={recordId}
        value={form.watch("certificate_file_url")}
        onChange={(url) => form.setValue("certificate_file_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <TextareaField control={form.control} name="description" label="Description" rows={4} />

      <NumberField control={form.control} name="display_order" label="Display order" min={0} />

      <SwitchField
        control={form.control}
        name="published"
        label="Published"
        description="Visible on the public site's Certifications section."
      />
    </AdminFormShell>
  );
}
