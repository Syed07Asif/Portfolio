import { z } from "zod";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { fileSchema, requiredUrlSchema, textSchema } from "./shared";

export const resumeSchema = z.object({
  file_url: requiredUrlSchema,
  storage_path: textSchema(500).optional().nullable(),
  version_label: textSchema(100).optional().nullable(),
  is_active: z.boolean().default(false),
});

export type ResumeInput = z.infer<typeof resumeSchema>;

export const resumeFileSchema = fileSchema(STORAGE_BUCKETS.resume);
