"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { experienceSchema } from "@/lib/validation";
import { CACHE_TAGS, STORAGE_BUCKETS } from "@/lib/constants";
import { deleteStorageFolder } from "@/lib/storage/cleanup";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  withRecordId,
  type ActionResult,
} from "./shared";

/** Experience renders on the homepage only (the Experience timeline) — see docs/content-management.md's cache-invalidation table. */
function revalidateExperience() {
  updateTag(CACHE_TAGS.experience);
  revalidatePath("/");
}

export const createExperience = createAdminAction(
  async (_admin, recordId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(experienceSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("experience")
      .insert({ ...withRecordId(recordId), ...parsed.data })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[lib/actions/experience] createExperience:", error?.message);
      return actionError("Could not create this experience entry.");
    }

    revalidateExperience();
    return actionSuccess({ id: data.id });
  },
);

export const updateExperience = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(experienceSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { error } = await supabase.from("experience").update(parsed.data).eq("id", id);

    if (error) {
      console.error("[lib/actions/experience] updateExperience:", error.message);
      return actionError("Could not save changes.");
    }

    revalidateExperience();
    return actionSuccess({ id });
  },
);

export const deleteExperience = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  await deleteStorageFolder(STORAGE_BUCKETS.experience.id, id);

  const supabase = await createClient();
  const { error } = await supabase.from("experience").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/experience] deleteExperience:", error.message);
    return actionError("Could not delete this experience entry.");
  }

  revalidateExperience();
  return actionSuccess(null);
});

export const toggleExperiencePublished = createAdminAction(
  async (_admin, id: string, published: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();
    const { error } = await supabase.from("experience").update({ published }).eq("id", id);

    if (error) {
      console.error("[lib/actions/experience] toggleExperiencePublished:", error.message);
      return actionError("Could not update publish status.");
    }

    revalidateExperience();
    return actionSuccess(null);
  },
);

export const reorderExperience = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("experience").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/experience] reorderExperience:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  revalidateExperience();
  return actionSuccess(null);
});
