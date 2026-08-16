import { z } from "zod";
import { optionalUrlSchema, requiredTextSchema, textSchema } from "./shared";

export const navItemSchema = z.object({
  label: requiredTextSchema(50),
  href: z.string().min(1, "Href is required"),
});

export const featureFlagsSchema = z.record(z.string(), z.boolean());

export const siteSettingsSchema = z.object({
  site_title: requiredTextSchema(200),
  meta_description: textSchema(300).optional().nullable(),
  og_image_url: optionalUrlSchema,
  primary_nav: z.array(navItemSchema),
  feature_flags: featureFlagsSchema,
  analytics_enabled: z.boolean().default(false),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
