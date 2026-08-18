import { z } from "zod";
import { displayOrderSchema, publishedSchema, requiredTextSchema, textSchema } from "./shared";

export const skillSchema = z.object({
  category_id: z.uuid("Must reference a valid skill category"),
  name: requiredTextSchema(100),
  icon: textSchema(100).optional().nullable(),
  proficiency: z.int().min(0).max(100).optional().nullable(),
  display_order: displayOrderSchema,
  published: publishedSchema,
});

export type SkillInput = z.infer<typeof skillSchema>;

/** BulkSkillAdd's "one name per line" quick-entry form — every row lands in the same category, unpublished by default (same as a normal single create), name-only (icon/proficiency are edited afterward via the normal SkillForm if needed). */
export const bulkSkillNamesSchema = z.object({
  category_id: z.uuid(),
  names: z.array(requiredTextSchema(100)).min(1, "Add at least one skill name"),
});

export type BulkSkillNamesInput = z.infer<typeof bulkSkillNamesSchema>;
