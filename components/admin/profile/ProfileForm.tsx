"use client";

import { useState } from "react";
import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { TextField, TextareaField } from "@/components/admin/form/fields";
import { ImageUploader } from "@/components/admin/upload/ImageUploader";
import { profileSchema, type ProfileInput } from "@/lib/validation";
import { upsertProfile } from "@/lib/actions/profile";
import type { Profile } from "@/types/content";

export interface ProfileFormProps {
  /** null the first time this is ever saved — the singleton row doesn't exist yet. */
  profile: Profile | null;
}

/** Every field paired with the same "where does this show up" note the brief asked for, sourced from the actual components that read `profile.*` — see components/sections/Hero.tsx and About.tsx. */
export function ProfileForm({ profile }: ProfileFormProps) {
  // Stable folder name for the avatar uploader before the singleton row
  // exists — same pattern EducationForm uses (see that file's comment).
  const [newRecordId] = useState(() => crypto.randomUUID());
  const recordId = profile?.id ?? newRecordId;

  const defaultValues: ProfileInput = {
    full_name: profile?.full_name ?? "",
    headline: profile?.headline ?? "",
    tagline: profile?.tagline ?? "",
    short_bio: profile?.short_bio ?? "",
    long_bio: profile?.long_bio ?? "",
    avatar_url: profile?.avatar_url ?? null,
    location: profile?.location ?? "",
    availability_status: profile?.availability_status ?? "",
    current_role: profile?.current_role ?? "",
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: profileSchema,
    defaultValues,
    onSubmit: (values) => upsertProfile(values),
    successMessage: "Profile updated.",
    redirectTo: "/admin/profile",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel="Save changes"
      cancelHref="/admin"
    >
      <ImageUploader
        label="Avatar"
        bucket="profile"
        recordId={recordId}
        value={form.watch("avatar_url")}
        onChange={(url) => form.setValue("avatar_url", url, { shouldDirty: true, shouldValidate: true })}
        disabled={isPending}
      />

      <TextField
        control={form.control}
        name="full_name"
        label="Full name"
        description="Shown as the site name in the navbar, and as the heading on the Hero and About sections."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="headline"
          label="Headline"
          description="Hero's subheading — falls back to Current role when empty. Also About's focus-area line."
        />
        <TextField
          control={form.control}
          name="current_role"
          label="Current role"
          description="Shown in About's quick facts, and as Headline's fallback in the Hero."
        />
      </div>

      <TextField
        control={form.control}
        name="tagline"
        label="Tagline"
        description="Short line shown under the Hero's headline."
      />

      <TextareaField
        control={form.control}
        name="short_bio"
        label="Short bio"
        rows={3}
        maxLength={500}
        description="Hero section's intro paragraph."
      />

      <TextareaField
        control={form.control}
        name="long_bio"
        label="Long bio"
        rows={10}
        maxLength={5000}
        description="About section's full biography — separate paragraphs with a blank line between them."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="location"
          label="Location"
          description="Shown in About's quick facts."
        />
        <TextField
          control={form.control}
          name="availability_status"
          label="Availability status"
          description="Shown as the Hero's availability badge, and in About's quick facts."
        />
      </div>
    </AdminFormShell>
  );
}
