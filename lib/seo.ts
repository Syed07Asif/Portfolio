import type { Metadata } from "next";

/**
 * Shared SEO primitives — the one place the site's absolute origin, the
 * canonical-URL rules, and the OG/Twitter card shape are defined. Every
 * route's `generateMetadata` goes through `buildPageMetadata` below rather
 * than hand-assembling `openGraph`/`twitter` objects, because Next replaces
 * those objects wholesale on override (they are *not* deep-merged with the
 * parent layout's): a page that sets `openGraph.title` and nothing else
 * silently drops the layout's image, url, and site_name. Funnelling every
 * page through one builder makes that impossible to get wrong.
 *
 * Content still comes from the database (CLAUDE.md's core principle) — this
 * module only knows the *shape* of a well-formed page's metadata, never the
 * words in it.
 */

/**
 * The public origin, normalised without a trailing slash. Falls back to
 * localhost so `next build` and local dev work without the env var set;
 * production must set NEXT_PUBLIC_SITE_URL or every canonical/OG URL will
 * point at localhost (see docs/deployment.md).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** `metadataBase` for the root layout — also what `absoluteUrl` resolves against. */
export const METADATA_BASE = new URL(SITE_URL);

/**
 * Route-relative path -> absolute URL. Already-absolute values (a Supabase
 * Storage URL, an external profile link) pass through untouched, so callers
 * can hand this a database column without knowing which kind it holds.
 */
export function absoluteUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Search engines truncate around here; going longer just gets cut off in the SERP. */
export const META_DESCRIPTION_MAX_LENGTH = 160;

/**
 * Collapses whitespace and trims to a whole word within `max` characters,
 * appending an ellipsis only when something was actually cut. Returns
 * undefined for empty input so callers can spread it into a Metadata object
 * without producing an empty `<meta name="description">`.
 */
export function truncateForMeta(
  text: string | null | undefined,
  max: number = META_DESCRIPTION_MAX_LENGTH,
): string | undefined {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  if (normalized.length <= max) return normalized;

  const clipped = normalized.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).replace(/[,.;:\-\s]+$/, "")}…`;
}

/** The one social-card size every platform crops from — 1.91:1, LinkedIn/X/WhatsApp's shared sweet spot. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export interface OgImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface PageMetadataInput {
  /** Page title *before* the layout's `%s | Brand` template is applied. */
  title: string;
  /** True for the homepage, whose title is already the full site title and must not be suffixed with the brand a second time. */
  titleIsAbsolute?: boolean;
  description?: string | null;
  /** Route-relative canonical path, e.g. `/projects/foo`. Resolved against metadataBase by Next. */
  path: string;
  /** og:site_name — the person's name, from the database, never hard-coded here. */
  siteName: string;
  /** Omit entirely (rather than passing an empty array) when there's genuinely no image; a card with no image beats a card with a broken one. */
  images?: OgImage[];
  /** `article` for a single piece of work (a project, later a blog post), `website` for index/landing routes. */
  type?: "website" | "article";
  /**
   * True when an `opengraph-image` metadata file already supplies this
   * route's card image. Next injects that image itself (with its own
   * cache-busting hash, which can't be reconstructed by hand), so `images`
   * stays empty here — but the Twitter card type still has to be widened to
   * `summary_large_image`, or X renders a small thumbnail beside the text
   * instead of the full-width preview the generated 1200x630 card is for.
   */
  hasFileConventionImage?: boolean;
  /** Internal tooling (`/styleguide`) and dead-end utility routes opt out of indexing here as well as in robots.txt — belt and braces, since robots.txt only discourages crawling, it doesn't remove a page already in the index. */
  noIndex?: boolean;
}

/**
 * Builds a complete, self-consistent metadata object: canonical, Open
 * Graph, and Twitter card all describing the same page with the same
 * strings. `twitter.card` is always `summary_large_image` when there's an
 * image — that's the layout LinkedIn/X/WhatsApp render as a full-width
 * preview rather than a thumbnail strip.
 */
export function buildPageMetadata({
  title,
  titleIsAbsolute = false,
  description,
  path,
  siteName,
  images,
  type = "website",
  hasFileConventionImage = false,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const resolvedDescription = truncateForMeta(description);
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const hasImages = Boolean(images?.length);
  const rendersLargeCard = hasImages || hasFileConventionImage;

  return {
    title: titleIsAbsolute ? { absolute: title } : title,
    ...(resolvedDescription ? { description: resolvedDescription } : {}),
    alternates: { canonical },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type,
      siteName,
      title,
      ...(resolvedDescription ? { description: resolvedDescription } : {}),
      url: canonical,
      locale: "en_US",
      ...(hasImages ? { images } : {}),
    },
    twitter: {
      card: rendersLargeCard ? "summary_large_image" : "summary",
      title,
      ...(resolvedDescription ? { description: resolvedDescription } : {}),
      ...(hasImages ? { images } : {}),
    },
  };
}
