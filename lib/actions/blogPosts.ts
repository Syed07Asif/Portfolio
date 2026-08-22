"use server";

import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { deleteStorageFolder } from "@/lib/storage/cleanup";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { blogPostSchema } from "@/lib/validation";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  withRecordId,
  type ActionResult,
} from "./shared";
import { resolvePublishedAt } from "./blogShared";

const UNIQUE_VIOLATION = "23505";

// No public site reads this table yet (see lib/data/blogPosts.ts's own doc
// comment), so unlike every other entity's actions there is nothing to
// revalidate/cache-bust in this file. `resolvePublishedAt` lives in
// ./blogShared.ts — see that file for why it can't be defined here.

export const createBlogPost = createAdminAction(
  async (_admin, recordId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(blogPostSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({ ...withRecordId(recordId), ...parsed.data, published_at: resolvePublishedAt(parsed.data.status, null) })
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === UNIQUE_VIOLATION) {
        return actionError("That slug is already in use.", { slug: ["That slug is already in use."] });
      }
      console.error("[lib/actions/blogPosts] createBlogPost:", error?.message);
      return actionError("Could not create this post.");
    }

    return actionSuccess({ id: data.id });
  },
);

export const updateBlogPost = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(blogPostSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data: existing } = await supabase.from("blog_posts").select("published_at").eq("id", id).maybeSingle();

    const { error } = await supabase
      .from("blog_posts")
      .update({ ...parsed.data, published_at: resolvePublishedAt(parsed.data.status, existing?.published_at ?? null) })
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return actionError("That slug is already in use.", { slug: ["That slug is already in use."] });
      }
      console.error("[lib/actions/blogPosts] updateBlogPost:", error.message);
      return actionError("Could not save changes.");
    }

    return actionSuccess({ id });
  },
);

export const deleteBlogPost = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  const supabase = await createClient();

  // Blog posts own a cover image, so they need the same storage cleanup as
  // every other entity with an uploader. This call was simply missing until
  // Phase 25 audited the delete paths — the only reason it never produced a
  // visible bug is that the public blog does not exist yet, so almost no
  // post has ever been created, let alone deleted.
  await deleteStorageFolder(STORAGE_BUCKETS.blog.id, id);

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/blogPosts] deleteBlogPost:", error.message);
    return actionError("Could not delete this post.");
  }

  return actionSuccess(null);
});

export const reorderBlogPosts = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("blog_posts").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/blogPosts] reorderBlogPosts:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  return actionSuccess(null);
});

/** Live duplicate-check for SlugField, scoped to "any *other* post already using this slug" — same shape as checkProjectSlugAvailability. */
export async function checkBlogSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return false;
  if (!slug) return true;

  const supabase = await createClient();
  let query = supabase.from("blog_posts").select("id").ilike("slug", slug).limit(1);
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) {
    console.error("[lib/actions/blogPosts] checkBlogSlugAvailability:", error.message);
    return true;
  }
  return !data || data.length === 0;
}
