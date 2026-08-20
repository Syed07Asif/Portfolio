import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { getActiveResume, getContactLinks, getProfile, getSiteSettings } from "@/lib/data";
import { DEFAULT_NAV_ITEMS, DEFAULT_WORDMARK } from "@/lib/constants";
import { OG_IMAGE_SIZE, absoluteUrl, truncateForMeta } from "@/lib/seo";

const FALLBACK_TITLE = "Syed Asif — Analytics & ML Engineer";
const FALLBACK_DESCRIPTION = "Portfolio of Syed Asif, Analytics & ML Engineer.";

/**
 * Public-site metadata defaults, driven by siteSettings (which has no
 * meaning for `/admin`, hence living here rather than in the root layout).
 *
 * The title *template* is the important part: every page under this group
 * sets a bare title ("Projects", a project's own name) and Next renders it
 * as "Projects | Syed Asif". The homepage opts out via `title.absolute`,
 * since `site_title` already contains the name and would otherwise read
 * "Syed Asif — Analytics & ML Engineer | Syed Asif".
 *
 * The `openGraph`/`twitter` blocks here are defaults for any route that
 * doesn't build its own. Note Next *replaces* these objects wholesale when
 * a child page defines its own rather than merging field by field — which
 * is exactly why every page goes through `buildPageMetadata` (lib/seo.ts)
 * instead of setting one or two OG fields and hoping the rest is inherited.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [siteSettings, profile] = await Promise.all([getSiteSettings(), getProfile()]);

  const brand = profile?.full_name ?? DEFAULT_WORDMARK;
  const title = siteSettings?.site_title ?? FALLBACK_TITLE;
  const description = truncateForMeta(siteSettings?.meta_description) ?? FALLBACK_DESCRIPTION;
  const defaultImages = siteSettings?.og_image_url
    ? [{ url: absoluteUrl(siteSettings.og_image_url), alt: title, ...OG_IMAGE_SIZE }]
    : undefined;

  return {
    title: { default: title, template: `%s | ${brand}` },
    description,
    applicationName: brand,
    authors: [{ name: brand, url: absoluteUrl("/") }],
    creator: brand,
    publisher: brand,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      title,
      description,
      url: absoluteUrl("/"),
      locale: "en_US",
      ...(defaultImages ? { images: defaultImages } : {}),
    },
    twitter: {
      card: defaultImages ? "summary_large_image" : "summary",
      title,
      description,
      ...(defaultImages ? { images: defaultImages } : {}),
    },
  };
}

/**
 * The public site's chrome — Navbar, Footer, skip link, page transitions —
 * everything the old single `app/layout.tsx` used to render around
 * `{children}` before Phase 17 split it out so `/admin` could have its own
 * shell instead. `MotionProvider` is already applied once at the true root;
 * `PageTransition` (route-change fade) is public-site-only, deliberately not
 * wrapping `/admin` for a snappier, less decorative admin panel.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [siteSettings, profile, contactLinks, resume] = await Promise.all([
    getSiteSettings(),
    getProfile(),
    getContactLinks(),
    getActiveResume(),
  ]);

  const navItems = siteSettings?.primary_nav?.length ? siteSettings.primary_nav : DEFAULT_NAV_ITEMS;
  const wordmark = profile?.full_name ?? DEFAULT_WORDMARK;
  const identityLine = profile?.tagline ?? profile?.headline ?? null;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-accent-foreground focus-visible:outline-none"
      >
        Skip to content
      </a>
      <Navbar navItems={navItems} wordmark={wordmark} />
      <main id="main" className="flex flex-1 flex-col pt-(--header-height)">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer
        navItems={navItems}
        contactLinks={contactLinks}
        wordmark={wordmark}
        identityLine={identityLine}
        hasResume={Boolean(resume)}
      />
    </>
  );
}
