import { z } from "zod";
import { optionalImageUrlSchema, requiredTextSchema, textSchema } from "./shared";

export const profileSchema = z.object({
  full_name: requiredTextSchema(200),
  headline: textSchema(200).optional().nullable(),
  short_bio: textSchema(500).optional().nullable(),
  long_bio: textSchema(5000).optional().nullable(),
  avatar_url: optionalImageUrlSchema,
  location: textSchema(200).optional().nullable(),
  availability_status: textSchema(200).optional().nullable(),
  current_role: textSchema(200).optional().nullable(),
  tagline: textSchema(200).optional().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
