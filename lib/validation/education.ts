import { z } from "zod";
import {
  displayOrderSchema,
  optionalDateSchema,
  optionalUrlSchema,
  publishedSchema,
  requiredTextSchema,
  textSchema,
} from "./shared";

export const educationSchema = z.object({
  institution: requiredTextSchema(200),
  degree: requiredTextSchema(200),
  field_of_study: textSchema(200).optional().nullable(),
  institution_logo_url: optionalUrlSchema,
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  grade: textSchema(100).optional().nullable(),
  description: textSchema(3000).optional().nullable(),
  link_url: optionalUrlSchema,
  display_order: displayOrderSchema,
  published: publishedSchema,
});

export type EducationInput = z.infer<typeof educationSchema>;
