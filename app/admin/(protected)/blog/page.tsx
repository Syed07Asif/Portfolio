import { Suspense } from "react";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data";
import { fetchBlogPostsForAdmin } from "@/lib/data/blogPosts";
import { PageHeader } from "@/components/admin/PageHeader";
import { BlogPostTable } from "@/components/admin/blog/BlogPostTable";
import { AdminTableSkeleton } from "@/components/admin/table/AdminTableSkeleton";

export const metadata: Metadata = { title: "Blog" };

async function BlogPostTableSection() {
  const items = await fetchBlogPostsForAdmin();
  return <BlogPostTable items={items} />;
}

/**
 * The sidebar disables this link when blog_enabled is off, but a direct URL
 * visit bypasses that UI-level gate — so this page (and new/, [id]/edit/)
 * each check the same flag themselves rather than trusting the sidebar's
 * disabled state alone.
 */
export default async function AdminBlogPage() {
  const siteSettings = await getSiteSettings();
  const blogEnabled = siteSettings?.feature_flags.blog_enabled ?? false;

  if (!blogEnabled) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-20 text-center">
        <p className="text-body-lg font-medium text-foreground">Blog is disabled</p>
        <p className="max-w-sm text-small text-foreground-muted">
          Enable the blog feature flag in Settings to use this section.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Blog posts — editor only. The public blog stays off regardless."
        action={{ label: "Add post", href: "/admin/blog/new" }}
      />
      <Suspense fallback={<AdminTableSkeleton columns={3} rows={4} />}>
        <BlogPostTableSection />
      </Suspense>
    </div>
  );
}
