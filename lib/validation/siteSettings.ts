import { z } from "zod";
import { optionalAssetUrlSchema, requiredTextSchema, textSchema } from "./shared";

/**
 * `hidden` is stored inside the same `primary_nav` jsonb array rather than
 * needing a schema migration — the public `NavItem` type (types/content.ts)
 * stays `{label, href}` only; lib/data/siteSettings.ts's public
 * `fetchSiteSettings` filters out hidden entries (and strips the flag)
 * before Navbar/Footer ever see the array, so "hide" is purely an
 * admin-side concept that doesn't leak into the public-facing shape.
 */
export const navItemSchema = z.object({
  label: requiredTextSchema(50),
  href: z.string().min(1, "Href is required"),
  hidden: z.boolean().default(false),
});
export type NavItemInput = z.infer<typeof navItemSchema>;

export const featureFlagsSchema = z.record(z.string(), z.boolean());

export const siteSettingsSchema = z.object({
  site_title: requiredTextSchema(200),
  meta_description: textSchema(300).optional().nullable(),
  // Uploaded asset (see optionalAssetUrlSchema) — the seed points this at a
  // root-relative placeholder path.
  og_image_url: optionalAssetUrlSchema,
  primary_nav: z.array(navItemSchema),
  feature_flags: featureFlagsSchema,
  analytics_enabled: z.boolean().default(false),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
