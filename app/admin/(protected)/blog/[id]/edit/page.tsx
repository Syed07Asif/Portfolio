import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/data";
import { fetchBlogPostByIdForAdmin } from "@/lib/data/blogPosts";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { BlogPostForm } from "@/components/admin/blog/BlogPostForm";

export const metadata: Metadata = { title: "Edit Post" };

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const siteSettings = await getSiteSettings();
  if (!siteSettings?.feature_flags.blog_enabled) redirect("/admin/blog");

  const { id } = await params;
  const post = await fetchBlogPostByIdForAdmin(id);

  if (!post) notFound();

  return (
    <EntityFormPageShell title={`Edit ${post.title || "post"}`} description="Update this post.">
      <BlogPostForm post={post} defaultDisplayOrder={post.display_order} />
    </EntityFormPageShell>
  );
}
