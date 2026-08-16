import { z } from "zod";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  displayOrderSchema,
  fileSchema,
  optionalDateSchema,
  optionalUrlSchema,
  publishedSchema,
  requiredTextSchema,
  textSchema,
} from "./shared";

export const achievementSchema = z.object({
  title: requiredTextSchema(200),
  description: textSchema(2000).optional().nullable(),
  date: optionalDateSchema,
  organization: textSchema(200).optional().nullable(),
  image_url: optionalUrlSchema,
  document_url: optionalUrlSchema,
  external_link: optionalUrlSchema,
  display_order: displayOrderSchema,
  published: publishedSchema,
});

export type AchievementInput = z.infer<typeof achievementSchema>;

export const achievementFileSchema = fileSchema(STORAGE_BUCKETS.achievements);
