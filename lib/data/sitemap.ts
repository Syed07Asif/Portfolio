import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import { logDataError } from "./shared";

/**
 * Reads that exist purely to give `app/sitemap.ts` real `lastModified`
 * dates. Deliberately separate from the entity modules: nothing on the
 * rendered site needs `updated_at`, so bolting it onto `getProjects()`
 * would widen a hot query for a cold consumer.
 */

export interface ProjectSitemapEntry {
  slug: string;
  updated_at: string;
}

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. Published rows only, same as every other public read. */
export async function fetchProjectSitemapEntries(): Promise<ProjectSitemapEntry[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("projects")
    .select("slug, updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false });

  if (error) {
    logDataError("getProjectSitemapEntries", error);
    return [];
  }
  return data ?? [];
}

export const getProjectSitemapEntries = unstable_cache(fetchProjectSitemapEntries, ["project-sitemap-entries"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.projects],
});

/**
 * The newest `updated_at` across every table the homepage renders — its
 * genuine last-modified date, since the homepage is a single page composed
 * of all of them. Each table is queried for just its own newest row (one
 * indexed `order ... limit 1` each, all in flight together), rather than
 * pulling rows and reducing in JS.
 *
 * RLS does the filtering for free here: anon only ever sees published rows,
 * so a draft edited five minutes ago correctly does *not* move the
 * homepage's public last-modified date.
 */
export async function fetchHomepageLastModified(): Promise<string | null> {
  const supabase = createStaticClient();
  const newestPerTable = [
    supabase.from("profile").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("skill_categories").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("skills").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("experience").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("education").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("projects").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("certifications").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("achievements").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    supabase.from("contact_links").select("updated_at").order("updated_at", { ascending: false }).limit(1),
  ];

  const results = await Promise.all(newestPerTable);

  let newest: string | null = null;
  for (const { data, error } of results) {
    if (error) {
      // One unreadable table shouldn't cost the sitemap its other dates.
      logDataError("getHomepageLastModified", error);
      continue;
    }
    const candidate = data?.[0]?.updated_at ?? null;
    if (candidate && (!newest || candidate > newest)) {
      newest = candidate;
    }
  }

  return newest;
}

/**
 * Tagged with every content tag it actually reads, so publishing a change
 * through the admin panel invalidates the sitemap's date alongside the page
 * that changed — see docs/content-management.md's cache-invalidation table.
 */
export const getHomepageLastModified = unstable_cache(fetchHomepageLastModified, ["homepage-last-modified"], {
  revalidate: 3600,
  tags: [
    CACHE_TAGS.profile,
    CACHE_TAGS.skills,
    CACHE_TAGS.experience,
    CACHE_TAGS.education,
    CACHE_TAGS.projects,
    CACHE_TAGS.certifications,
    CACHE_TAGS.achievements,
    CACHE_TAGS.contactLinks,
  ],
});
