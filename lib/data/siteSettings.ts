import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { FeatureFlags, NavItem, SiteSettings } from "@/types/content";
import type { NavItemInput } from "@/lib/validation/siteSettings";
import { logDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  const supabase = createStaticClient();
  // Queries the public_site_settings VIEW, not the site_settings table —
  // see docs/architecture.md's Security section for why.
  const { data, error } = await supabase
    .from("public_site_settings")
    .select("site_title, meta_description, og_image_url, primary_nav, feature_flags, analytics_enabled")
    .maybeSingle();

  if (error) {
    logDataError("getSiteSettings", error);
    return null;
  }
  if (!data || !data.site_title) {
    return null;
  }

  // Hidden nav items live in the same jsonb array (see lib/validation/
  // siteSettings.ts's navItemSchema doc comment) — filtered out here, and
  // the `hidden` flag itself stripped, so Navbar/Footer only ever see the
  // {label, href} shape NavItem already promises.
  const rawNav = (data.primary_nav ?? []) as unknown as NavItemInput[];
  const primary_nav: NavItem[] = rawNav.filter((item) => !item.hidden).map(({ label, href }) => ({ label, href }));

  return {
    site_title: data.site_title,
    meta_description: data.meta_description,
    og_image_url: data.og_image_url,
    primary_nav,
    feature_flags: (data.feature_flags ?? { blog_enabled: false }) as unknown as FeatureFlags,
    analytics_enabled: data.analytics_enabled ?? false,
  };
}

export const getSiteSettings = unstable_cache(fetchSiteSettings, ["site-settings"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.siteSettings],
});

/** The admin form's full read/write shape — every column the singleton row has, including internal bookkeeping (`id`) the public view omits, and `primary_nav` with each item's `hidden` flag intact (unlike the public fetch above). */
export interface AdminSiteSettings {
  id: string;
  site_title: string;
  meta_description: string | null;
  og_image_url: string | null;
  primary_nav: NavItemInput[];
  feature_flags: FeatureFlags;
  analytics_enabled: boolean;
}

/**
 * Admin-only read of the base `site_settings` table (not the
 * `public_site_settings` view the public fetch above uses) — the view
 * deliberately omits `id`, which the admin's upsert needs, and its RLS has
 * no public-read policy at all on the base table (only the admin's own
 * `site_settings_admin_all` policy), so this must use the cookie-aware
 * `createClient()` rather than the static one. Not wrapped in
 * `unstable_cache` for the same reasons as fetchEducationForAdmin.
 */
export async function fetchSiteSettingsForAdmin(): Promise<AdminSiteSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("id, site_title, meta_description, og_image_url, primary_nav, feature_flags, analytics_enabled")
    .maybeSingle();

  if (error) {
    logDataError("fetchSiteSettingsForAdmin", error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    site_title: data.site_title ?? "",
    meta_description: data.meta_description,
    og_image_url: data.og_image_url,
    primary_nav: (data.primary_nav ?? []) as unknown as NavItemInput[],
    feature_flags: (data.feature_flags ?? { blog_enabled: false }) as unknown as FeatureFlags,
    analytics_enabled: data.analytics_enabled ?? false,
  };
}
