import { z } from "zod";
import { Constants } from "@/types/database";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  displayOrderSchema,
  fileSchema,
  optionalDateSchema,
  optionalUrlSchema,
  publishedSchema,
  requiredTextSchema,
  requiredUrlSchema,
  slugSchema,
  textSchema,
} from "./shared";

export const projectStatusSchema = z.enum(Constants.public.Enums.project_status);
export const mediaTypeSchema = z.enum(Constants.public.Enums.media_type);

export const projectSchema = z
  .object({
    slug: slugSchema,
    name: requiredTextSchema(200),
    short_description: textSchema(300).optional().nullable(),
    description: textSchema(5000).optional().nullable(),
    problem_statement: textSchema(3000).optional().nullable(),
    solution: textSchema(3000).optional().nullable(),
    purpose: textSchema(1000).optional().nullable(),
    logo_url: optionalUrlSchema,
    cover_image_url: optionalUrlSchema,
    github_url: optionalUrlSchema,
    demo_url: optionalUrlSchema,
    video_url: optionalUrlSchema,
    status: projectStatusSchema.default("planned"),
    start_date: optionalDateSchema,
    end_date: optionalDateSchema,
    featured: z.boolean().default(false),
    display_order: displayOrderSchema,
    published: publishedSchema,
  })
  .refine((data) => !data.start_date || !data.end_date || data.end_date >= data.start_date, {
    message: "End date can't be before the start date",
    path: ["end_date"],
  });

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectTechnologySchema = z.object({
  project_id: z.uuid(),
  name: requiredTextSchema(100),
  icon: textSchema(100).optional().nullable(),
  display_order: displayOrderSchema,
});

export type ProjectTechnologyInput = z.infer<typeof projectTechnologySchema>;

export const projectFeatureSchema = z.object({
  project_id: z.uuid(),
  title: requiredTextSchema(200),
  description: textSchema(1000).optional().nullable(),
  display_order: displayOrderSchema,
});

export type ProjectFeatureInput = z.infer<typeof projectFeatureSchema>;

export const projectMediaSchema = z.object({
  project_id: z.uuid(),
  file_url: requiredUrlSchema,
  storage_path: textSchema(500).optional().nullable(),
  media_type: mediaTypeSchema,
  title: textSchema(200).optional().nullable(),
  alt_text: textSchema(300).optional().nullable(),
  caption: textSchema(500).optional().nullable(),
  display_order: displayOrderSchema,
});

export type ProjectMediaInput = z.infer<typeof projectMediaSchema>;

export const projectMediaFileSchema = fileSchema(STORAGE_BUCKETS.projects);
