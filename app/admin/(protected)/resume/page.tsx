import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchResumesForAdmin } from "@/lib/data/resumes";
import { PageHeader } from "@/components/admin/PageHeader";
import { ResumeUploadForm } from "@/components/admin/resume/ResumeUploadForm";
import { ResumeList } from "@/components/admin/resume/ResumeList";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Resume" };

async function ResumeListSection() {
  const items = await fetchResumesForAdmin();
  return <ResumeList items={items} />;
}

/**
 * Unlike every other entity so far, Resume has no create/edit page pair —
 * uploading a version and activating it are the only two writes, both
 * handled inline here (ResumeUploadForm, ResumeList), so there's nothing a
 * separate route would add. JSX-scoped <Suspense>, not a route-level
 * loading.tsx — see docs/progress.md's Phase 18 entry for why the latter
 * breaks hydration for nested dynamic routes on this Next.js version (no
 * nested routes exist under /admin/resume, but the same shared pattern is
 * kept for consistency with every other list page).
 */
export default function AdminResumePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Resume" description="Manage the PDF resume downloadable from the public site." />
      <ResumeUploadForm />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={2} />}>
        <ResumeListSection />
      </Suspense>
    </div>
  );
}
