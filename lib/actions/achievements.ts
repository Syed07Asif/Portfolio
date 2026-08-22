"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { achievementSchema } from "@/lib/validation";
import { CACHE_TAGS, STORAGE_BUCKETS } from "@/lib/constants";
import { deleteStorageFolder } from "@/lib/storage/cleanup";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  type ActionResult,
} from "./shared";

/** Achievements render in exactly one place — the homepage's Achievements section. */
function revalidateAchievements() {
  updateTag(CACHE_TAGS.achievements);
  revalidatePath("/");
}

export const createAchievement = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(achievementSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase.from("achievements").insert(parsed.data).select("id").single();

    if (error || !data) {
      console.error("[lib/actions/achievements] createAchievement:", error?.message);
      return actionError("Could not create this achievement.");
    }

    revalidateAchievements();
    return actionSuccess({ id: data.id });
  },
);

export const updateAchievement = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(achievementSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { error } = await supabase.from("achievements").update(parsed.data).eq("id", id);

    if (error) {
      console.error("[lib/actions/achievements] updateAchievement:", error.message);
      return actionError("Could not save changes.");
    }

    revalidateAchievements();
    return actionSuccess({ id });
  },
);

export const deleteAchievement = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  await deleteStorageFolder(STORAGE_BUCKETS.achievements.id, id);

  const supabase = await createClient();
  const { error } = await supabase.from("achievements").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/achievements] deleteAchievement:", error.message);
    return actionError("Could not delete this achievement.");
  }

  revalidateAchievements();
  return actionSuccess(null);
});

export const toggleAchievementPublished = createAdminAction(
  async (_admin, id: string, published: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();
    const { error } = await supabase.from("achievements").update({ published }).eq("id", id);

    if (error) {
      console.error("[lib/actions/achievements] toggleAchievementPublished:", error.message);
      return actionError("Could not update publish status.");
    }

    revalidateAchievements();
    return actionSuccess(null);
  },
);

export const reorderAchievements = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("achievements").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/achievements] reorderAchievements:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  revalidateAchievements();
  return actionSuccess(null);
});
