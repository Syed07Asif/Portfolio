"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resumeSchema } from "@/lib/validation";
import { CACHE_TAGS, STORAGE_BUCKETS } from "@/lib/constants";
import { deleteStorageFolder } from "@/lib/storage/cleanup";
import { actionError, actionSuccess, createAdminAction, parseInput, type ActionResult } from "./shared";

/** The active resume is linked from Hero, Contact, and Footer, all on the homepage, plus the standalone /resume download route. */
function revalidateResume() {
  updateTag(CACHE_TAGS.resume);
  revalidatePath("/");
  revalidatePath("/resume");
}

/**
 * Uploads a new resume row. `is_active` on the parsed input decides whether
 * this version becomes the live one immediately — if so, the atomic
 * `set_active_resume` RPC (see the Phase 21 migration) runs right after the
 * insert, in a second call rather than trying to fold "insert" and "atomic
 * single-active swap" into one round trip; the insert always leaves the new
 * row inactive first, so there's never a window with two active rows even
 * if the RPC call is the one that fails.
 */
export const createResume = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(resumeSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const { is_active, ...rest } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("resumes")
      .insert({ ...rest, is_active: false })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[lib/actions/resumes] createResume:", error?.message);
      return actionError("Could not save this resume upload.");
    }

    if (is_active) {
      const { error: activateError } = await supabase.rpc("set_active_resume", { resume_id: data.id });
      if (activateError) {
        console.error("[lib/actions/resumes] createResume (activate):", activateError.message);
        return actionError("Uploaded, but couldn't set it as active. You can activate it from the list.");
      }
    }

    revalidateResume();
    return actionSuccess({ id: data.id });
  },
);

/**
 * The atomic swap itself — see the Phase 21 migration's own comment for why
 * this is one Postgres function call (one implicit transaction) rather than
 * a deactivate-then-activate pair of .update() calls from here.
 */
export const activateResume = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_active_resume", { resume_id: id });

  if (error) {
    console.error("[lib/actions/resumes] activateResume:", error.message);
    return actionError("Could not activate this resume.");
  }

  revalidateResume();
  return actionSuccess(null);
});

/** Refuses to delete the currently-active resume — the public site would otherwise lose its download link until another version is activated, a worse failure mode than just asking the admin to activate a different version first. */
export const deleteResume = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  const supabase = await createClient();
  const { data: resume } = await supabase.from("resumes").select("is_active").eq("id", id).maybeSingle();

  if (resume?.is_active) {
    return actionError("Can't delete the active resume — activate a different version first.");
  }

  await deleteStorageFolder(STORAGE_BUCKETS.resume.id, id);

  const { error } = await supabase.from("resumes").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/resumes] deleteResume:", error.message);
    return actionError("Could not delete this resume.");
  }

  revalidateResume();
  return actionSuccess(null);
});
