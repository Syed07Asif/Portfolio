import { z } from "zod";
import { Constants } from "@/types/database";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { displayOrderSchema, fileSchema, optionalUrlSchema, requiredTextSchema, slugSchema, textSchema } from "./shared";

export const blogStatusSchema = z.enum(Constants.public.Enums.blog_status);

export const blogPostSchema = z.object({
  title: requiredTextSchema(200),
  slug: slugSchema,
  excerpt: textSchema(500).optional().nullable(),
  content: textSchema(50000).optional().nullable(),
  cover_image_url: optionalUrlSchema,
  category: textSchema(100).optional().nullable(),
  tags: z.array(requiredTextSchema(50)).optional().nullable(),
  author: textSchema(200).optional().nullable(),
  reading_time: z.int().nonnegative().optional().nullable(),
  status: blogStatusSchema.default("draft"),
  display_order: displayOrderSchema,
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

export const blogCoverImageFileSchema = fileSchema(STORAGE_BUCKETS.blog);
