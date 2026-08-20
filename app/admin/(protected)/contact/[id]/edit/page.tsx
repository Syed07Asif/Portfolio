import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchContactLinkByIdForAdmin } from "@/lib/data/contactLinks";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { ContactLinkForm } from "@/components/admin/contact/ContactLinkForm";

export const metadata: Metadata = { title: "Edit Contact Link" };

interface EditContactLinkPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContactLinkPage({ params }: EditContactLinkPageProps) {
  const { id } = await params;
  const contactLink = await fetchContactLinkByIdForAdmin(id);

  if (!contactLink) notFound();

  return (
    <EntityFormPageShell title={`Edit ${contactLink.label}`} description="Update this contact link.">
      <ContactLinkForm contactLink={contactLink} defaultDisplayOrder={contactLink.display_order} />
    </EntityFormPageShell>
  );
}
