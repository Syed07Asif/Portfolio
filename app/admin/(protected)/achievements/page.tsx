import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchAchievementsForAdmin } from "@/lib/data/achievements";
import { PageHeader } from "@/components/admin/PageHeader";
import { AchievementTable } from "@/components/admin/achievements/AchievementTable";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Achievements" };

async function AchievementTableSection() {
  const items = await fetchAchievementsForAdmin();
  return <AchievementTable items={items} />;
}

/** JSX-scoped <Suspense>, not a route-level loading.tsx — see docs/progress.md's Phase 18 entry for why the latter breaks hydration for nested dynamic routes on this Next.js version. */
export default function AdminAchievementsPage() {
  return (
    <div>
      <PageHeader
        title="Achievements"
        description="Awards, publications, and talks shown on the public site."
        action={{ label: "Add achievement", href: "/admin/achievements/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={4} />}>
        <AchievementTableSection />
      </Suspense>
    </div>
  );
}
