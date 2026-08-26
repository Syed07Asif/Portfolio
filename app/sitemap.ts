import type { MetadataRoute } from "next";
import { getHomepageLastModified, getProjectSitemapEntries, tolerateUnavailable } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

/**
 * Rendered per request — deliberately, and this took two attempts to get
 * right.
 *
 * The route used to carry `export const revalidate = 3600`, on the reasoning
 * that an hour-stale sitemap is harmless. It is worse than that: the *route*
 * cache is separate from the *data* cache, so `updateTag(CACHE_TAGS.projects)`
 * — which the admin panel fires on every publish — invalidated the query
 * underneath this file while the already-rendered XML kept being served. A
 * newly published project stayed missing from the sitemap for up to an hour
 * no matter what the admin did.
 *
 * The first fix added `revalidatePath("/sitemap.xml")` to the publish action.
 * **That does not work** — verified against production by toggling a real
 * project off and on and watching the sitemap stay unchanged (`x-vercel-cache:
 * HIT`, no new entry, while the row's `updated_at` proved the action had run
 * 46 seconds earlier). `revalidatePath` does not reach Next's metadata
 * routes.
 *
 * So the route opts out of caching entirely instead. That sounds expensive
 * and isn't: every read below goes through `lib/data`'s `unstable_cache`
 * wrappers, which *are* tag-invalidated, so a request here costs a
 * cache lookup rather than a database round trip until a publish busts the
 * tag. Crawlers fetch this file rarely, and a sitemap's whole job is to be
 * current.
 */
export const dynamic = "force-dynamic";

/**
 * Every publicly indexable URL, derived entirely from the database — adding
 * a project is a row, never an edit here (CLAUDE.md's core principle applies
 * to the sitemap as much as to the pages).
 *
 * Deliberately absent, and each for its own reason:
 * - `/admin/*` and `/styleguide` — disallowed in app/robots.ts and marked
 *   noindex; listing them here would contradict both.
 * - `/resume` — a redirect to a binary download, not a page to index.
 * - `/resume/unavailable` — an error-state page, reachable only when there
 *   is nothing to download.
 * - the blog — real in the schema and the admin panel, but it has no public
 *   route yet, so there is no URL to list (see docs/progress.md's "Next up").
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Tolerated: a sitemap listing only the static routes is a far better
  // outcome than a 500 that tells a crawler the whole file is broken.
  const [projects, homepageLastModified] = await Promise.all([
    tolerateUnavailable(getProjectSitemapEntries(), []),
    tolerateUnavailable(getHomepageLastModified(), null),
  ]);

  // Entries come back newest-first, so the first row is the index page's own
  // last-modified date. `new Date()` is the fallback for an empty/unreadable
  // table — a sitemap entry must carry *some* date, and "now" is the only
  // honest answer when the real one can't be read.
  const projectsLastModified = projects[0]?.updated_at ?? homepageLastModified ?? new Date().toISOString();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: homepageLastModified ?? projectsLastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/projects"),
      lastModified: projectsLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: project.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
