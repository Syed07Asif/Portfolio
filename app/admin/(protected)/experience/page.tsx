import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchExperienceForAdmin } from "@/lib/data/experience";
import { PageHeader } from "@/components/admin/PageHeader";
import { ExperienceTable } from "@/components/admin/experience/ExperienceTable";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Experience" };

async function ExperienceTableSection() {
  const items = await fetchExperienceForAdmin();
  return <ExperienceTable items={items} />;
}

/**
 * Uses an explicit `<Suspense>` around just the table's own data fetch, not
 * the route-level `loading.tsx` file convention — see
 * app/admin/(protected)/education/page.tsx's identical comment for why: a
 * segment-level `loading.tsx` here would also wrap `new/` and `[id]/edit/`
 * and reproducibly break their hydration on this project's Next.js version.
 */
export default function AdminExperiencePage() {
  return (
    <div>
      <PageHeader
        title="Experience"
        description="Roles shown on the public site's Experience timeline."
        action={{ label: "Add experience", href: "/admin/experience/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={4} />}>
        <ExperienceTableSection />
      </Suspense>
    </div>
  );
}
