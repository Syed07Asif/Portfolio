import type { Metadata } from "next";
import { fetchContactLinksForAdmin } from "@/lib/data/contactLinks";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { ContactLinkForm } from "@/components/admin/contact/ContactLinkForm";

export const metadata: Metadata = { title: "New Contact Link" };

export default async function NewContactLinkPage() {
  const items = await fetchContactLinksForAdmin();

  return (
    <EntityFormPageShell title="New contact link" description="Add a contact channel.">
      <ContactLinkForm defaultDisplayOrder={items.length} />
    </EntityFormPageShell>
  );
}
