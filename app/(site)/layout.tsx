import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { getActiveResume, getContactLinks, getProfile, getSiteSettings } from "@/lib/data";
import { DEFAULT_NAV_ITEMS, DEFAULT_WORDMARK } from "@/lib/constants";

const FALLBACK_TITLE = "Syed Asif — Analytics & ML Engineer";
const FALLBACK_DESCRIPTION = "Portfolio of Syed Asif, Analytics & ML Engineer.";

/**
 * Public-site title/description/OG image — moved here from the root layout
 * (Phase 17) since it's driven by siteSettings, which has no meaning for
 * `/admin`. Next merges metadata root-to-leaf, so this simply overrides the
 * root's generic fallback title for every route under this group.
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings();

  return {
    title: siteSettings?.site_title ?? FALLBACK_TITLE,
    description: siteSettings?.meta_description ?? FALLBACK_DESCRIPTION,
    ...(siteSettings?.og_image_url
      ? { openGraph: { images: [{ url: siteSettings.og_image_url }] } }
      : {}),
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
