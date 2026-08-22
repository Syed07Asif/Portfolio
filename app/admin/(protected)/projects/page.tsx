import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchProjectsForAdmin } from "@/lib/data/projects";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProjectsListClient } from "@/components/admin/projects/ProjectsListClient";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Projects" };

async function ProjectsTableSection() {
  const items = await fetchProjectsForAdmin();
  return <ProjectsListClient items={items} />;
}

/**
 * An explicit, JSX-scoped `<Suspense>` around just this section's own data
 * fetch — not a route-level `loading.tsx` file, which would also wrap the
 * nested `new/` and `[id]/edit/` segments and reproduce the hydration bug
 * documented in docs/content-management.md's "A route-level loading.tsx
 * broke hydration for its nested dynamic children" (same pattern
 * app/admin/(protected)/education/page.tsx already established).
 */
export default function AdminProjectsPage() {
  return (
    <div>
      <PageHeader
        title="Projects"
        description="The core portfolio entity — case studies shown on the homepage and /projects."
        action={{ label: "Add project", href: "/admin/projects/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={5} rows={4} />}>
        <ProjectsTableSection />
      </Suspense>
    </div>
  );
}
