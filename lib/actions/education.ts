"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { educationSchema } from "@/lib/validation";
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

/**
 * Education renders in exactly one place on the public site — the
 * homepage's Education section (components/sections/Education.tsx) — so
 * every mutation invalidates just the two layers that cover it: the
 * `lib/data` query-result cache (`updateTag`, not `revalidateTag` — Next
 * 16 requires a cache-life profile argument for `revalidateTag`, and its
 * own doc comment says `updateTag` is the correct call specifically
 * inside a Server Action, for immediate read-your-own-writes semantics)
 * and Next's Full Route Cache for the one rendered page that embeds it.
 * See docs/content-management.md's cache-invalidation table.
 */
function revalidateEducation() {
  updateTag(CACHE_TAGS.education);
  revalidatePath("/");
}

export const createEducation = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(educationSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase.from("education").insert(parsed.data).select("id").single();

    if (error || !data) {
      console.error("[lib/actions/education] createEducation:", error?.message);
      return actionError("Could not create this education entry.");
    }

    revalidateEducation();
    return actionSuccess({ id: data.id });
  },
);

export const updateEducation = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(educationSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { error } = await supabase.from("education").update(parsed.data).eq("id", id);

    if (error) {
      console.error("[lib/actions/education] updateEducation:", error.message);
      return actionError("Could not save changes.");
    }

    revalidateEducation();
    return actionSuccess({ id });
  },
);

export const deleteEducation = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  await deleteStorageFolder(STORAGE_BUCKETS.education.id, id);

  const supabase = await createClient();
  const { error } = await supabase.from("education").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/education] deleteEducation:", error.message);
    return actionError("Could not delete this education entry.");
  }

  revalidateEducation();
  return actionSuccess(null);
});

export const toggleEducationPublished = createAdminAction(
  async (_admin, id: string, published: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();
    const { error } = await supabase.from("education").update({ published }).eq("id", id);

    if (error) {
      console.error("[lib/actions/education] toggleEducationPublished:", error.message);
      return actionError("Could not update publish status.");
    }

    revalidateEducation();
    return actionSuccess(null);
  },
);

export const reorderEducation = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("education").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/education] reorderEducation:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  revalidateEducation();
  return actionSuccess(null);
});

export const duplicateEducation = createAdminAction(async (_admin, id: string): Promise<ActionResult<{ id: string }>> => {
  const supabase = await createClient();
  const { data: original, error: fetchError } = await supabase
    .from("education")
    .select("institution, degree, field_of_study, start_date, end_date, grade, description, link_url, display_order")
    .eq("id", id)
    .single();

  if (fetchError || !original) {
    console.error("[lib/actions/education] duplicateEducation (fetch):", fetchError?.message);
    return actionError("Could not find this education entry.");
  }

  // Duplicating a record never duplicates its files — a copy referencing
  // the original's storage folder would silently break the moment either
  // row's logo is edited or deleted (see docs/content-management.md).
  const { data: created, error: insertError } = await supabase
    .from("education")
    .insert({
      ...original,
      institution: `${original.institution} (copy)`,
      institution_logo_url: null,
      published: false,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[lib/actions/education] duplicateEducation (insert):", insertError?.message);
    return actionError("Could not duplicate this education entry.");
  }

  revalidateEducation();
  return actionSuccess({ id: created.id });
});
