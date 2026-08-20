import { z } from "zod";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  displayOrderSchema,
  fileSchema,
  optionalAssetUrlSchema,
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
  // Uploaded assets (see optionalAssetUrlSchema) — the seed points both at
  // root-relative placeholder paths. `external_link` stays strict: it's a
  // genuine external reference link, never an upload.
  image_url: optionalAssetUrlSchema,
  document_url: optionalAssetUrlSchema,
  external_link: optionalUrlSchema,
  display_order: displayOrderSchema,
  published: publishedSchema,
});

export type AchievementInput = z.infer<typeof achievementSchema>;

export const achievementFileSchema = fileSchema(STORAGE_BUCKETS.achievements);
