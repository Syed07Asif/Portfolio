import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/types/content";
import { logDataError } from "./shared";

/**
 * Admin-only module — no public `fetchX`/`getX` pair exists here, unlike
 * every other entity in lib/data. Per CLAUDE.md's Phase 21 brief, the public
 * blog stays off entirely ("this proves the architecture supports it later
 * without becoming scope creep now"); only the admin panel reads this table
 * for now, so there's no public consumer to build a cached fetch for yet.
 */

const ADMIN_BLOG_POST_COLUMNS =
  "id, title, slug, excerpt, content, cover_image_url, category, tags, author, reading_time, published_at, status, display_order";

export type AdminBlogPost = BlogPost;

export async function fetchBlogPostsForAdmin(): Promise<AdminBlogPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(ADMIN_BLOG_POST_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    logDataError("fetchBlogPostsForAdmin", error);
    return [];
  }
  return data ?? [];
}

export async function fetchBlogPostByIdForAdmin(id: string): Promise<AdminBlogPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(ADMIN_BLOG_POST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logDataError(`fetchBlogPostByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}
