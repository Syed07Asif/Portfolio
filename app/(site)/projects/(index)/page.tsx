import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ContentUnavailable } from "@/components/sections/ContentUnavailable";
import { JsonLd } from "@/components/seo/JsonLd";
import { DataUnavailableError, getProfile, getProjects, getSiteSettings, tolerateUnavailable } from "@/lib/data";
import { DEFAULT_WORDMARK } from "@/lib/constants";
import { buildBreadcrumbJsonLd, jsonLdGraph } from "@/lib/jsonLd";
import { OG_IMAGE_SIZE, absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { ProjectGrid } from "@/components/sections/projects/ProjectGrid";

/**
 * Title is the bare word "Projects" — the layout's template turns it into
 * "Projects | Syed Asif", which is what a browser tab and a search result
 * both want. The description names the person rather than repeating the
 * word "projects" three times.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [profile, siteSettings] = await Promise.all([
    tolerateUnavailable(getProfile(), null),
    tolerateUnavailable(getSiteSettings(), null),
  ]);
  const name = profile?.full_name ?? DEFAULT_WORDMARK;

  return buildPageMetadata({
    title: "Projects",
    description: `Every published project by ${name}${profile?.headline ? `, ${profile.headline}` : ""}.`,
    path: "/projects",
    siteName: name,
    images: siteSettings?.og_image_url
      ? [{ url: absoluteUrl(siteSettings.og_image_url), alt: `Projects by ${name}`, ...OG_IMAGE_SIZE }]
      : undefined,
  });
}

/**
 * The dedicated project index: every published project, unfiltered
 * (`ProjectGrid` with no `featuredOnly`/`limit`), unlike the homepage
 * section's featured/curated subset.
 *
 * `cardHeadingLevel={2}` because this page's h1 is followed directly by the
 * cards, with no section heading in between — the homepage's own Projects
 * section supplies that h2 itself, so its cards stay at 3.
 */
export default async function ProjectsPage() {
  // See app/(site)/(home)/page.tsx for why the degraded state is handled
  // here rather than left to app/(site)/error.tsx: this page is statically
  // generated, and a throw on that path never reaches an error boundary.
  let projects, profile;
  try {
    [projects, profile] = await Promise.all([getProjects(), getProfile()]);
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
    return <ContentUnavailable retryHref="/projects" />;
  }

  const name = profile?.full_name ?? DEFAULT_WORDMARK;

  const graph = jsonLdGraph(
    buildBreadcrumbJsonLd([
      { name, path: "/" },
      { name: "Projects", path: "/projects" },
    ]),
  );

  return (
    <Container className="flex flex-col gap-10 py-(--space-section-y)">
      <JsonLd data={graph} />
      <div className="flex flex-col gap-3">
        <p className="text-caption font-medium uppercase tracking-wider text-accent">Portfolio</p>
        <h1 className="text-h1 font-display font-bold text-foreground">All Projects</h1>
        <p className="max-w-2xl text-body-lg text-foreground-secondary">
          Every published project, in one place.
        </p>
      </div>
      <ProjectGrid projects={projects} cardHeadingLevel={2} />
    </Container>
  );
}
