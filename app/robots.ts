import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

/**
 * Crawling is open by default — this is a portfolio whose whole job is to
 * be found. Only three things are held back, and each is also marked
 * `noindex` in its own route's metadata, because robots.txt and noindex do
 * different jobs: robots.txt asks a crawler not to *fetch* a URL, while
 * noindex asks it not to *list* one. A URL that is only disallowed here can
 * still appear in results (crawlers index URLs they were told not to fetch
 * if something links to them); a URL that is only noindexed still gets
 * fetched. The two together are what actually keeps a page out.
 *
 * - `/admin/` — the whole admin panel, including `/admin/login` and the
 *   `/admin/preview/*` draft-mode toggles.
 * - `/styleguide` — the internal design-token QA tool.
 * - `/resume/unavailable` — the "no active resume" dead end; the real
 *   `/resume` download stays crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/styleguide", "/resume/unavailable"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
