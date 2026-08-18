import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchSkillCategoriesWithSkillsForAdmin } from "@/lib/data/skills";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";
import { SkillCategoryTable } from "@/components/admin/skills/SkillCategoryTable";
import { SkillCategorySection } from "@/components/admin/skills/SkillCategorySection";

export const metadata: Metadata = { title: "Skills" };

async function SkillsSections() {
  const categories = await fetchSkillCategoriesWithSkillsForAdmin();

  return (
    <div className="flex flex-col gap-8">
      <SkillCategoryTable categories={categories} />

      {categories.length > 0 ? (
        <div className="flex flex-col gap-6">
          <h2 className="font-display text-h4 font-semibold text-foreground">Skills by category</h2>
          {categories.map((category) => (
            <SkillCategorySection key={category.id} category={category} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Two related entities on one screen, per the brief: the category table up
 * top (reorder/edit/delete-with-choice), then each category's own skills
 * list below it (bulk-add + the standard per-skill AdminTable). Uses an
 * explicit JSX-scoped `<Suspense>` around the whole data-fetching section,
 * not a route-level `loading.tsx` — this segment has nested dynamic
 * children (`categories/new`, `categories/[id]/edit`, `new`, `[id]/edit`),
 * and a segment-level `loading.tsx` reproducibly breaks their hydration on
 * this project's Next.js version (see docs/content-management.md's "Two
 * real bugs" section and app/admin/(protected)/education/page.tsx, which
 * hit this first).
 */
export default function AdminSkillsPage() {
  return (
    <div>
      <PageHeader
        title="Skills"
        description="Categories and the skills within them, shown on the public site's Skills section."
        action={{ label: "Add category", href: "/admin/skills/categories/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={4} />}>
        <SkillsSections />
      </Suspense>
    </div>
  );
}
