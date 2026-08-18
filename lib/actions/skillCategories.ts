"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteSkillCategorySchema, skillCategorySchema } from "@/lib/validation";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  type ActionResult,
} from "./shared";
import { revalidateSkills } from "./skillsShared";

export const createSkillCategory = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(skillCategorySchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase.from("skill_categories").insert(parsed.data).select("id").single();

    if (error || !data) {
      console.error("[lib/actions/skillCategories] createSkillCategory:", error?.message);
      return actionError(
        error?.code === "23505" ? "That slug is already in use." : "Could not create this category.",
      );
    }

    revalidateSkills();
    return actionSuccess({ id: data.id });
  },
);

export const updateSkillCategory = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(skillCategorySchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { error } = await supabase.from("skill_categories").update(parsed.data).eq("id", id);

    if (error) {
      console.error("[lib/actions/skillCategories] updateSkillCategory:", error.message);
      return actionError(error.code === "23505" ? "That slug is already in use." : "Could not save changes.");
    }

    revalidateSkills();
    return actionSuccess({ id });
  },
);

/**
 * `skills.category_id` references this table `on delete restrict` (see
 * supabase/migrations), so a category with skills can't just be deleted —
 * the caller must resolve them first via one of two explicit strategies,
 * never a silent cascade. `input` is validated against
 * `deleteSkillCategorySchema`'s discriminated union rather than accepting
 * an untyped options object, same "never write new validation rules in the
 * action file itself" rule every other action follows.
 */
export const deleteSkillCategory = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<null>> => {
    const parsed = parseInput(deleteSkillCategorySchema, input);
    if (!parsed.success) return actionError("Invalid delete request.");

    const supabase = await createClient();

    if (parsed.data.strategy === "delete-skills") {
      const { error: deleteSkillsError } = await supabase.from("skills").delete().eq("category_id", id);
      if (deleteSkillsError) {
        console.error("[lib/actions/skillCategories] deleteSkillCategory (skills):", deleteSkillsError.message);
        return actionError("Could not delete this category's skills.");
      }
    } else {
      const { error: moveError } = await supabase
        .from("skills")
        .update({ category_id: parsed.data.targetCategoryId })
        .eq("category_id", id);
      if (moveError) {
        console.error("[lib/actions/skillCategories] deleteSkillCategory (move):", moveError.message);
        return actionError("Could not move this category's skills.");
      }
    }

    const { error } = await supabase.from("skill_categories").delete().eq("id", id);
    if (error) {
      console.error("[lib/actions/skillCategories] deleteSkillCategory:", error.message);
      return actionError("Could not delete this category.");
    }

    revalidateSkills();
    return actionSuccess(null);
  },
);

export const reorderSkillCategories = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<null>> => {
    const parsed = parseInput(reorderInputSchema, input);
    if (!parsed.success) return actionError("Invalid reorder request.");

    const supabase = await createClient();
    const results = await Promise.all(
      parsed.data.map(({ id, display_order }) =>
        supabase.from("skill_categories").update({ display_order }).eq("id", id),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("[lib/actions/skillCategories] reorderSkillCategories:", failed.error.message);
      return actionError("Could not save the new order.");
    }

    revalidateSkills();
    return actionSuccess(null);
  },
);
