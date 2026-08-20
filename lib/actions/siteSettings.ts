"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteSettingsSchema } from "@/lib/validation";
import { CACHE_TAGS } from "@/lib/constants";
import { actionError, actionSuccess, createAdminAction, parseInput, type ActionResult } from "./shared";

/** site_settings drives the nav, page titles, and OG defaults on every route — busts the whole route tree, not just "/". */
function revalidateSiteSettings() {
  updateTag(CACHE_TAGS.siteSettings);
  revalidatePath("/", "layout");
}

/**
 * Single-record upsert, not create/edit — `site_settings` is a singleton
 * table (`is_singleton boolean unique`, same pattern as
 * lib/actions/profile.ts's upsertProfile).
 */
export const upsertSiteSettings = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(siteSettingsSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .upsert({ ...parsed.data, is_singleton: true }, { onConflict: "is_singleton" })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[lib/actions/siteSettings] upsertSiteSettings:", error?.message);
      return actionError("Could not save settings.");
    }

    revalidateSiteSettings();
    return actionSuccess({ id: data.id });
  },
);
