import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { FeatureFlags, NavItem, SiteSettings } from "@/types/content";
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

  return {
    site_title: data.site_title,
    meta_description: data.meta_description,
    og_image_url: data.og_image_url,
    primary_nav: (data.primary_nav ?? []) as unknown as NavItem[],
    feature_flags: (data.feature_flags ?? { blog_enabled: false }) as unknown as FeatureFlags,
    analytics_enabled: data.analytics_enabled ?? false,
  };
}

export const getSiteSettings = unstable_cache(fetchSiteSettings, ["site-settings"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.siteSettings],
});
