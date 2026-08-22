import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/data";
import { fetchBlogPostsForAdmin } from "@/lib/data/blogPosts";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { BlogPostForm } from "@/components/admin/blog/BlogPostForm";

export const metadata: Metadata = { title: "New Post" };

export default async function NewBlogPostPage() {
  const siteSettings = await getSiteSettings();
  if (!siteSettings?.feature_flags.blog_enabled) redirect("/admin/blog");

  const items = await fetchBlogPostsForAdmin();

  return (
    <EntityFormPageShell title="New post" description="Add a blog post.">
      <BlogPostForm defaultDisplayOrder={items.length} />
    </EntityFormPageShell>
  );
}
