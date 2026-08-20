import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchCertificationByIdForAdmin } from "@/lib/data/certifications";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { CertificationForm } from "@/components/admin/certifications/CertificationForm";

export const metadata: Metadata = { title: "Edit Certification" };

interface EditCertificationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCertificationPage({ params }: EditCertificationPageProps) {
  const { id } = await params;
  const certification = await fetchCertificationByIdForAdmin(id);

  if (!certification) notFound();

  return (
    <EntityFormPageShell title={`Edit ${certification.name}`} description="Update this certification.">
      <CertificationForm certification={certification} defaultDisplayOrder={certification.display_order} />
    </EntityFormPageShell>
  );
}
