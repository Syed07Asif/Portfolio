"use client";

import { MailIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { resolveContactIcon } from "@/lib/contactLinks";
import { deleteContactLink, reorderContactLinks, toggleContactLinkPublished } from "@/lib/actions/contactLinks";
import type { AdminContactLink } from "@/lib/data/contactLinks";

export interface ContactLinkTableProps {
  items: AdminContactLink[];
}

const TYPE_LABEL: Record<AdminContactLink["type"], string> = {
  email: "Email",
  linkedin: "LinkedIn",
  github: "GitHub",
  whatsapp: "WhatsApp",
  twitter: "Twitter / X",
  other: "Other",
};

function renderTypeCell(item: AdminContactLink) {
  const Icon = resolveContactIcon(item.type);
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-foreground-muted" aria-hidden="true" />
      {TYPE_LABEL[item.type]}
    </span>
  );
}

export function ContactLinkTable({ items }: ContactLinkTableProps) {
  return (
    <AdminTable
      items={items}
      entityName="contact link"
      getItemLabel={(item) => item.label}
      editHref={(item) => `/admin/contact/${item.id}/edit`}
      onReorder={reorderContactLinks}
      onTogglePublished={(item, published) => toggleContactLinkPublished(item.id, published)}
      onDelete={(item) => deleteContactLink(item.id)}
      columns={[
        {
          key: "label",
          header: "Label",
          render: (item) => <span className="font-medium text-foreground">{item.label}</span>,
        },
        { key: "type", header: "Type", render: renderTypeCell },
        { key: "value", header: "Value", render: (item) => <span className="truncate">{item.value}</span> },
      ]}
      emptyState={
        <EmptyState
          icon={MailIcon}
          title="No contact links yet"
          description="Add your first contact channel to show it on the public site."
          createHref="/admin/contact/new"
          createLabel="Add contact link"
        />
      }
    />
  );
}
