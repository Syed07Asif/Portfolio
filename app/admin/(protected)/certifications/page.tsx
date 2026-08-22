import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchCertificationsForAdmin } from "@/lib/data/certifications";
import { PageHeader } from "@/components/admin/PageHeader";
import { CertificationTable } from "@/components/admin/certifications/CertificationTable";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Certifications" };

async function CertificationTableSection() {
  const items = await fetchCertificationsForAdmin();
  return <CertificationTable items={items} />;
}

/** JSX-scoped <Suspense>, not a route-level loading.tsx — see docs/progress.md's Phase 18 entry for why the latter breaks hydration for nested dynamic routes on this Next.js version. */
export default function AdminCertificationsPage() {
  return (
    <div>
      <PageHeader
        title="Certifications"
        description="Professional certifications shown on the public site."
        action={{ label: "Add certification", href: "/admin/certifications/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={4} />}>
        <CertificationTableSection />
      </Suspense>
    </div>
  );
}
