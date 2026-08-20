"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { SwitchField, TextField, TextareaField } from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { NavItemsField } from "@/components/admin/settings/NavItemsField";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validation";
import { upsertSiteSettings } from "@/lib/actions/siteSettings";
import type { AdminSiteSettings } from "@/lib/data/siteSettings";

export interface SettingsFormProps {
  /** null the first time this is ever saved — the singleton row doesn't exist yet. */
  settings: AdminSiteSettings | null;
  /** Keyed by nav href — see NavItemsField's own doc comment. */
  sectionHasContent: Record<string, boolean>;
}

export function SettingsForm({ settings, sectionHasContent }: SettingsFormProps) {
  // Stable folder name for the OG image uploader before the singleton row
  // exists — same pattern ProfileForm uses.
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = settings?.id ?? newRecordId;

  const defaultValues: SiteSettingsInput = {
    site_title: settings?.site_title ?? "",
    meta_description: settings?.meta_description ?? "",
    og_image_url: settings?.og_image_url ?? null,
    primary_nav: settings?.primary_nav ?? [],
    feature_flags: settings?.feature_flags ?? { blog_enabled: false },
    analytics_enabled: settings?.analytics_enabled ?? false,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: siteSettingsSchema,
    defaultValues,
    onSubmit: (values) => upsertSiteSettings(values),
    successMessage: "Settings saved.",
    redirectTo: "/admin/settings",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel="Save changes"
      cancelHref="/admin"
    >
      <TextField
        control={form.control}
        name="site_title"
        label="Site title"
        description="The <title> tag and site branding text."
      />

      <TextareaField
        control={form.control}
        name="meta_description"
        label="Meta description"
        rows={3}
        maxLength={300}
        description="Default description used by search engines and link previews."
      />

      <ImageUploader
        label="Default OG image"
        bucket="settings"
        recordId={recordId}
        value={form.watch("og_image_url")}
        onChange={(url) => form.setValue("og_image_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <NavItemsField control={form.control} sectionHasContent={sectionHasContent} disabled={isPending} />

      <SwitchField
        control={form.control}
        name="feature_flags.blog_enabled"
        label="Blog enabled"
        description="Turns on the Blog section in this admin panel's sidebar. The public blog stays unbuilt regardless."
      />

      <SwitchField
        control={form.control}
        name="analytics_enabled"
        label="Analytics enabled"
        description="Whether analytics scripts should load on the public site."
      />
    </AdminFormShell>
  );
}
