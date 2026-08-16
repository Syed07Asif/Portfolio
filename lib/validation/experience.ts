import { z } from "zod";
import {
  dateSchema,
  displayOrderSchema,
  optionalDateSchema,
  optionalUrlSchema,
  publishedSchema,
  requiredTextSchema,
  textSchema,
} from "./shared";

export const experienceSchema = z
  .object({
    company: requiredTextSchema(200),
    role: requiredTextSchema(200),
    company_logo_url: optionalUrlSchema,
    location: textSchema(200).optional().nullable(),
    employment_type: textSchema(100).optional().nullable(),
    start_date: dateSchema,
    end_date: optionalDateSchema,
    is_current: z.boolean().default(false),
    description: textSchema(3000).optional().nullable(),
    responsibilities: z.array(requiredTextSchema(500)).optional().nullable(),
    technologies: z.array(requiredTextSchema(100)).optional().nullable(),
    link_url: optionalUrlSchema,
    display_order: displayOrderSchema,
    published: publishedSchema,
  })
  // Mirrors the experience_current_has_no_end_date check constraint in the
  // database — catching it here gives a form error instead of a raw SQL one.
  .refine((data) => !data.is_current || !data.end_date, {
    message: "A current role can't have an end date",
    path: ["end_date"],
  });

export type ExperienceInput = z.infer<typeof experienceSchema>;
