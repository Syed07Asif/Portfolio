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
