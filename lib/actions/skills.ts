"use server";

import { createClient } from "@/lib/supabase/server";
import { bulkSkillNamesSchema, skillSchema } from "@/lib/validation";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  type ActionResult,
} from "./shared";
import { revalidateSkills } from "./skillsShared";

export const createSkill = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(skillSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase.from("skills").insert(parsed.data).select("id").single();

    if (error || !data) {
      console.error("[lib/actions/skills] createSkill:", error?.message);
      return actionError("Could not create this skill.");
    }

    revalidateSkills();
    return actionSuccess({ id: data.id });
  },
);

export const updateSkill = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(skillSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { error } = await supabase.from("skills").update(parsed.data).eq("id", id);

    if (error) {
      console.error("[lib/actions/skills] updateSkill:", error.message);
      return actionError("Could not save changes.");
    }

    revalidateSkills();
    return actionSuccess({ id });
  },
);

export const deleteSkill = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  const supabase = await createClient();
  const { error } = await supabase.from("skills").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/skills] deleteSkill:", error.message);
    return actionError("Could not delete this skill.");
  }

  revalidateSkills();
  return actionSuccess(null);
});

export const toggleSkillPublished = createAdminAction(
  async (_admin, id: string, published: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();
    const { error } = await supabase.from("skills").update({ published }).eq("id", id);

    if (error) {
      console.error("[lib/actions/skills] toggleSkillPublished:", error.message);
      return actionError("Could not update publish status.");
    }

    revalidateSkills();
    return actionSuccess(null);
  },
);

/**
 * Reorders skills — the input's `display_order` values are already scoped
 * to whichever single category's list the admin dragged within (see
 * SkillCategorySection's own AdminTable instance), so this needs no
 * category filtering of its own; it just writes back whatever pairs it's
 * given, identical to reorderEducation/reorderSkillCategories.
 */
export const reorderSkills = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("skills").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/skills] reorderSkills:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  revalidateSkills();
  return actionSuccess(null);
});

/**
 * BulkSkillAdd's fast path — one insert of N rows instead of N round trips,
 * so adding a long list of skills to a category doesn't mean N page
 * reloads (or N Server Action calls) the way a "create one skill" form
 * repeated N times would. `display_order` for each new row continues from
 * `startOrder` (the caller passes the category's current skill count) so
 * bulk-added skills land after whatever already exists rather than all
 * colliding at 0.
 */
export const createSkillsBulk = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ count: number }>> => {
    const parsed = parseInput(bulkSkillNamesSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { count: existingCount, error: countError } = await supabase
      .from("skills")
      .select("id", { count: "exact", head: true })
      .eq("category_id", parsed.data.category_id);

    if (countError) {
      console.error("[lib/actions/skills] createSkillsBulk (count):", countError.message);
      return actionError("Could not add these skills.");
    }

    const rows = parsed.data.names.map((name, index) => ({
      category_id: parsed.data.category_id,
      name,
      display_order: (existingCount ?? 0) + index,
      published: false,
    }));

    const { error } = await supabase.from("skills").insert(rows);
    if (error) {
      console.error("[lib/actions/skills] createSkillsBulk:", error.message);
      return actionError("Could not add these skills.");
    }

    revalidateSkills();
    return actionSuccess({ count: rows.length });
  },
);
