"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";
import { CACHE_TAGS } from "@/lib/constants";
import { actionError, actionSuccess, createAdminAction, parseInput, type ActionResult } from "./shared";

/** Profile renders on the homepage only (Hero + About) — see docs/content-management.md's cache-invalidation table. */
function revalidateProfile() {
  updateTag(CACHE_TAGS.profile);
  revalidatePath("/");
}

/**
 * Single-record upsert, not create/edit — `profile` is a singleton table
 * (`is_singleton boolean unique`, see supabase/migrations). Upserting on
 * that unique column handles both "no row yet" (first save ever creates
 * it) and "editing the existing row" with one action, matching
 * ProfileForm's single always-shown form rather than Education's
 * separate create/edit pages.
 */
export const upsertProfile = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(profileSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profile")
      .upsert({ ...parsed.data, is_singleton: true }, { onConflict: "is_singleton" })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[lib/actions/profile] upsertProfile:", error?.message);
      return actionError("Could not save profile changes.");
    }

    revalidateProfile();
    return actionSuccess({ id: data.id });
  },
);
