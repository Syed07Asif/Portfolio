import type { MetadataRoute } from "next";
import { getHomepageLastModified, getProjectSitemapEntries, tolerateUnavailable } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

/**
 * Matches the project detail route's own `revalidate`, so a project
 * published after the last build shows up in the sitemap within the same
 * hour it starts rendering — and, because `lib/data/sitemap.ts` tags its
 * reads, immediately when the admin panel revalidates the projects tag.
 */
export const revalidate = 3600;

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
