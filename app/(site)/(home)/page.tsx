import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Skills } from "@/components/sections/Skills";
import { Experience } from "@/components/sections/Experience";
import { Education } from "@/components/sections/Education";
import { Projects } from "@/components/sections/Projects";
import { Certifications } from "@/components/sections/Certifications";
import { Achievements } from "@/components/sections/Achievements";
import { Contact } from "@/components/sections/Contact";
import {
  AboutSkeleton,
  CardGridSectionSkeleton,
  HeroSkeleton,
  StackedListSectionSkeleton,
} from "@/components/sections/skeletons";
import { ContentUnavailable } from "@/components/sections/ContentUnavailable";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getContactLinks,
  getEducation,
  getExperience,
  getProfile,
  getSiteSettings,
  getSkillCategoriesWithSkills,
  tolerateUnavailable,
  DataUnavailableError,
} from "@/lib/data";
import { DEFAULT_WORDMARK } from "@/lib/constants";
import { buildPersonJsonLd, buildWebSiteJsonLd, jsonLdGraph } from "@/lib/jsonLd";
import { OG_IMAGE_SIZE, absoluteUrl, buildPageMetadata } from "@/lib/seo";

/**
 * The homepage's title is `site_title` verbatim (`titleIsAbsolute`) — it
 * already contains the name, so the layout's "%s | Syed Asif" template
 * would repeat it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [siteSettings, profile] = await Promise.all([
    tolerateUnavailable(getSiteSettings(), null),
    tolerateUnavailable(getProfile(), null),
  ]);

  const brand = profile?.full_name ?? DEFAULT_WORDMARK;
  const title = siteSettings?.site_title ?? brand;

  return buildPageMetadata({
    title,
    titleIsAbsolute: true,
    description: siteSettings?.meta_description ?? profile?.short_bio,
    path: "/",
    siteName: brand,
    images: siteSettings?.og_image_url
      ? [{ url: absoluteUrl(siteSettings.og_image_url), alt: title, ...OG_IMAGE_SIZE }]
      : undefined,
  });
}

/**
 * Every homepage section is real as of Phase 16 — no placeholders left. Each
 * is a Server Component that fetches its own content via lib/data and hides
 * itself entirely when it has nothing to show.
 *
 * **Phase 23: each section now has its own `<Suspense>` boundary**, so a
 * slow query in one section streams in on its own instead of holding back
 * the whole document. This page is statically prerendered in production, so
 * in the common case every boundary is already resolved by the time anyone
 * requests it; the boundaries earn their keep when the page renders
 * dynamically — a revalidation miss, a cold cache after a deploy, or draft
 * mode — which is exactly when a single slow section would otherwise cost
 * the visitor the entire page.
 *
 * One honest caveat, since these skeletons are sized to prevent layout
 * shift: a section that turns out to have *no* published rows renders
 * nothing at all (that's requirement 4's "the entire section, including its
 * heading, is not rendered"), so its skeleton collapses rather than being
 * replaced. That shift is unavoidable without pre-counting rows in a
 * separate query, and it only ever happens on a dynamic render of a section
 * that has no content to show in the first place.
 *
 * The structured-data graph is its own boundary with a `null` fallback: it
 * needs six reads and renders no visible pixels, so blocking the hero on it
 * would be pure cost.
 *
 * **The guard at the top decides whether this page can render at all.**
 * `getProfile()` is already fetched (and cached) by the sections below, so
 * it costs nothing extra — but doing it *here*, before any section streams,
 * is what lets a statically-generated render return the degraded state
 * instead of throwing. A throw on that path does not reach
 * app/(site)/error.tsx; Next returns a bare "Internal Server Error"
 * (verified against a real production build with PostgREST stopped), which
 * is exactly the raw error this phase exists to eliminate. See the guard's
 * own comment for why that response is allowed to be cached rather than
 * forced dynamic.
 */
export default async function Home() {
  try {
    await getProfile();
  } catch (error) {
    if (!(error instanceof DataUnavailableError)) throw error;
    // Deliberately NOT `connection()` here. Marking the render dynamic
    // would be the ideal way to keep an outage out of the route cache, but
    // it cannot convert an in-flight static generation — it throws
    // DYNAMIC_SERVER_USAGE, which Next turns straight back into the bare
    // 500 this guard exists to prevent (confirmed in a production build).
    // So the degraded page may be cached for up to `revalidate`. That is
    // the better of the two available trades: a styled, self-healing page
    // beats raw error text, and it clears on the next revalidation or the
    // moment the admin panel revalidates the projects tag.
    return <ContentUnavailable retryHref="/" />;
  }

  return (
    <>
      <Suspense fallback={null}>
        <HomeStructuredData />
      </Suspense>

      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<AboutSkeleton />}>
        <About />
      </Suspense>
      <Suspense fallback={<CardGridSectionSkeleton label="Loading skills" count={3} cardClassName="h-56" />}>
        <Skills />
      </Suspense>
      <Suspense fallback={<StackedListSectionSkeleton label="Loading experience" count={2} />}>
        <Experience />
      </Suspense>
      <Suspense fallback={<StackedListSectionSkeleton label="Loading education" count={1} itemClassName="h-32" />}>
        <Education />
      </Suspense>
      <Suspense fallback={<CardGridSectionSkeleton label="Loading projects" count={3} />}>
        <Projects />
      </Suspense>
      <Suspense fallback={<CardGridSectionSkeleton label="Loading certifications" count={3} cardClassName="h-48" />}>
        <Certifications />
      </Suspense>
      <Suspense fallback={<StackedListSectionSkeleton label="Loading achievements" count={2} itemClassName="h-24" />}>
        <Achievements />
      </Suspense>
      <Suspense fallback={<StackedListSectionSkeleton label="Loading contact details" count={1} itemClassName="h-48" />}>
        <Contact />
      </Suspense>
    </>
  );
}

/**
 * Split out of the page body so its six reads sit behind their own Suspense
 * boundary instead of blocking the first paint. Deliberately *not*
 * `tolerateUnavailable`: if the content store is unreachable, this throws
 * like every other section and the page shows the degraded state in
 * app/(site)/error.tsx — structured data describing content nobody can see
 * would be worse than none.
 */
async function HomeStructuredData() {
  const [profile, siteSettings, skillCategories, education, experience, contactLinks] = await Promise.all([
    getProfile(),
    getSiteSettings(),
    getSkillCategoriesWithSkills(),
    getEducation(),
    getExperience(),
    getContactLinks(),
  ]);

  const fallbackName = DEFAULT_WORDMARK;
  const graph = jsonLdGraph(
    buildPersonJsonLd({ profile, fallbackName, skillCategories, education, experience, contactLinks }),
    buildWebSiteJsonLd({ siteSettings, fallbackTitle: profile?.full_name ?? fallbackName }),
  );

  return <JsonLd data={graph} />;
}
