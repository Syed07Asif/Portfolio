import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchEducationForAdmin } from "@/lib/data/education";
import { PageHeader } from "@/components/admin/PageHeader";
import { EducationTable } from "@/components/admin/education/EducationTable";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Education" };

async function EducationTableSection() {
  const items = await fetchEducationForAdmin();
  return <EducationTable items={items} />;
}

/**
 * Uses an explicit `<Suspense>` around just the table's own data fetch,
 * not the route-level `loading.tsx` file convention: a `loading.tsx`
 * co-located with this route wraps the *entire segment*, which cascades
 * into `new/` and `[id]/edit/` too (Next's own documented behavior — a
 * segment's `loading.tsx` Suspense-wraps its nested children as well).
 * On this project's exact Next.js/Turbopack version, that combination —
 * a segment-level Suspense boundary wrapping a nested dynamic route that
 * itself reads cookies (forcing dynamic rendering) — reproducibly breaks
 * client hydration for the nested route's content on a hard navigation:
 * the page's HTML renders correctly, but no client event handlers ever
 * attach (confirmed directly: form elements carried no React fiber/props
 * after a hard load with `loading.tsx` present, and even a bare
 * `<form onSubmit>` with no other logic silently fell back to a native
 * browser submission). Removing the segment-level `loading.tsx` and using
 * a plain, JSX-scoped `<Suspense>` instead — which only ever wraps
 * `EducationTableSection` here, not a route segment — fixed it
 * completely. See docs/progress.md's Phase 18 entry for the full
 * before/after verification.
 */
export default function AdminEducationPage() {
  return (
    <div>
      <PageHeader
        title="Education"
        description="Degrees, certifications, and coursework shown on the public site."
        action={{ label: "Add education", href: "/admin/education/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={4} />}>
        <EducationTableSection />
      </Suspense>
    </div>
  );
}
