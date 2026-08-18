import { z } from "zod";
import { displayOrderSchema, requiredTextSchema, slugSchema, textSchema } from "./shared";

export const skillCategorySchema = z.object({
  name: requiredTextSchema(100),
  slug: slugSchema,
  description: textSchema(500).optional().nullable(),
  icon: textSchema(100).optional().nullable(),
  display_order: displayOrderSchema,
});

export type SkillCategoryInput = z.infer<typeof skillCategorySchema>;

/**
 * `skills.category_id` is `references skill_categories(id) on delete
 * restrict` (see supabase/migrations) — deleting a category that still has
 * skills must resolve them first. This is the explicit two-way choice the
 * admin UI requires before it will even attempt the delete: either take the
 * skills down with the category, or move them to another one first.
 */
export const deleteSkillCategorySchema = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("delete-skills") }),
  z.object({ strategy: z.literal("move-skills"), targetCategoryId: z.uuid() }),
]);

export type DeleteSkillCategoryInput = z.infer<typeof deleteSkillCategorySchema>;
