import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Skills } from "@/components/sections/Skills";
import { Experience } from "@/components/sections/Experience";
import { Education } from "@/components/sections/Education";
import { Projects } from "@/components/sections/Projects";
import { Certifications } from "@/components/sections/Certifications";
import { Achievements } from "@/components/sections/Achievements";
import { Contact } from "@/components/sections/Contact";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getContactLinks,
  getEducation,
  getExperience,
  getProfile,
  getSiteSettings,
  getSkillCategoriesWithSkills,
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
  const [siteSettings, profile] = await Promise.all([getSiteSettings(), getProfile()]);

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
 * The structured-data graph added in Phase 22 describes exactly what those
 * sections render: the Person is built from the same profile/skills/
 * education/experience/contact rows About, Skills, Experience, Education and
 * Contact display, so there is nothing in the markup that isn't also on the
 * page. Re-fetching them here costs nothing — every one of these is the
 * cached `getX` the sections themselves call, deduplicated within the
 * request.
 */
export default async function Home() {
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

  return (
    <>
      <JsonLd data={graph} />
      <Hero />
      <About />
      <Skills />
      <Experience />
      <Education />
      <Projects />
      <Certifications />
      <Achievements />
      <Contact />
    </>
  );
}
