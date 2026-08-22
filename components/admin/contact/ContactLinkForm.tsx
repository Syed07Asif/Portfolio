"use client";

import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { NumberField, SelectField, SwitchField, TextField } from "@/components/admin/form/fields";
import { contactLinkSchema, type ContactLinkInput } from "@/lib/validation";
import { createContactLink, updateContactLink } from "@/lib/actions/contactLinks";
import type { AdminContactLink } from "@/lib/data/contactLinks";

export interface ContactLinkFormProps {
  /** Omitted for the create form. */
  contactLink?: AdminContactLink;
  /** Where a new row lands in the list by default — the caller computes "append at the end" from the current row count. */
  defaultDisplayOrder: number;
}

const TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "github", label: "GitHub" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "twitter", label: "Twitter / X" },
  { value: "other", label: "Other" },
];

const VALUE_DESCRIPTION_BY_TYPE: Record<string, string> = {
  email: "The email address, e.g. hello@example.com — validated as a real email address.",
  whatsapp: "The phone number, e.g. +1 555 123 4567 — validated as a real phone number, used to build the wa.me link.",
  linkedin: "A short label for this channel, e.g. your handle or \"Connect on LinkedIn\".",
  github: "A short label for this channel, e.g. your username.",
  twitter: "A short label for this channel, e.g. your @handle.",
  other: "A short label for this channel, e.g. a handle or username.",
};

export function ContactLinkForm({ contactLink, defaultDisplayOrder }: ContactLinkFormProps) {
  const defaultValues: ContactLinkInput = {
    label: contactLink?.label ?? "",
    type: contactLink?.type ?? "email",
    value: contactLink?.value ?? "",
    url: contactLink?.url ?? null,
    icon: contactLink?.icon ?? "",
    display_order: contactLink?.display_order ?? defaultDisplayOrder,
    published: contactLink?.published ?? false,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: contactLinkSchema,
    defaultValues,
    onSubmit: (values) => (contactLink ? updateContactLink(contactLink.id, values) : createContactLink(values)),
    successMessage: contactLink ? "Contact link updated." : "Contact link created.",
    redirectTo: "/admin/contact",
  });

  const type = form.watch("type");

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={contactLink ? "Save changes" : "Create"}
      cancelHref="/admin/contact"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField control={form.control} name="label" label="Label" description='Shown as the card title, e.g. "Email".' />
        <SelectField control={form.control} name="type" label="Type" options={TYPE_OPTIONS} />
      </div>

      <TextField
        control={form.control}
        name="value"
        label={type === "email" ? "Email address" : type === "whatsapp" ? "Phone number" : "Value"}
        description={VALUE_DESCRIPTION_BY_TYPE[type] ?? undefined}
      />

      {type !== "email" && type !== "whatsapp" ? (
        <TextField
          control={form.control}
          name="url"
          label="Profile URL"
          type="url"
          description="Where this card links to, e.g. https://linkedin.com/in/yourname."
        />
      ) : null}

      <NumberField control={form.control} name="display_order" label="Display order" min={0} />

      <SwitchField
        control={form.control}
        name="published"
        label="Published"
        description="Visible on the public site's Contact section and Footer."
      />
    </AdminFormShell>
  );
}
