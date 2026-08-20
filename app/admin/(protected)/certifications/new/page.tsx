import type { Metadata } from "next";
import { fetchCertificationsForAdmin } from "@/lib/data/certifications";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { CertificationForm } from "@/components/admin/certifications/CertificationForm";

export const metadata: Metadata = { title: "New Certification" };

export default async function NewCertificationPage() {
  const items = await fetchCertificationsForAdmin();

  return (
    <EntityFormPageShell title="New certification" description="Add a professional certification.">
      <CertificationForm defaultDisplayOrder={items.length} />
    </EntityFormPageShell>
  );
}
