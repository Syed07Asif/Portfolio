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
