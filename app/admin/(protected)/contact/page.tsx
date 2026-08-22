import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchContactLinksForAdmin } from "@/lib/data/contactLinks";
import { getActiveResume } from "@/lib/data";
import { PageHeader } from "@/components/admin/PageHeader";
import { ContactLinkTable } from "@/components/admin/contact/ContactLinkTable";
import { ContactPreview } from "@/components/admin/contact/ContactPreview";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Contact" };

async function ContactSection() {
  const [items, resume] = await Promise.all([fetchContactLinksForAdmin(), getActiveResume()]);
  return (
    <div className="flex flex-col gap-8">
      <ContactLinkTable items={items} />
      <ContactPreview items={items} hasResume={Boolean(resume)} />
    </div>
  );
}

/** JSX-scoped <Suspense>, not a route-level loading.tsx — see docs/progress.md's Phase 18 entry for why the latter breaks hydration for nested dynamic routes on this Next.js version. */
export default function AdminContactPage() {
  return (
    <div>
      <PageHeader
        title="Contact"
        description="Contact channels shown on the public site's Contact section and Footer."
        action={{ label: "Add contact link", href: "/admin/contact/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={4} />}>
        <ContactSection />
      </Suspense>
    </div>
  );
}
