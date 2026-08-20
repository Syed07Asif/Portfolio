import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, FolderGit2 } from "lucide-react";
import { Button, Card, Container, Divider, Tag } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { getProfile, getProjectBySlug, getProjectSlugs, getProjects } from "@/lib/data";
import { fetchProjectBySlugForPreview } from "@/lib/data/projects";
import { selectProjects } from "@/lib/projects";
import { DEFAULT_WORDMARK } from "@/lib/constants";
import { buildBreadcrumbJsonLd, buildProjectJsonLd, jsonLdGraph } from "@/lib/jsonLd";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { formatOptionalDateRange, splitParagraphs } from "@/lib/utils";
import { ProjectCardImage } from "@/components/sections/projects/ProjectCardImage";
import { ProjectStatusBadge } from "@/components/sections/projects/ProjectStatusBadge";
import { ProjectMediaGallery } from "@/components/sections/projects/ProjectMediaGallery";
import { DraftPreviewBanner } from "@/components/sections/projects/DraftPreviewBanner";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * ISR, not pure SSG: published projects are pre-rendered at build time via
 * generateStaticParams, but `dynamicParams` is intentionally left at its
 * default (`true`, i.e. not exported/overridden here) so a slug published
 * *after* the last build still renders on first request instead of 404ing
 * — Next falls through to calling this same page function on demand. This
 * `revalidate`, together with `dynamicParams`, is the whole "no redeploy
 * needed" mechanism; see docs/architecture.md's "Per-route revalidation"
 * section for the full reasoning (and how it composes with the tag-based
 * invalidation `lib/data` already does for a future admin panel).
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * Title is the project's own name, which the layout's template renders as
 * "Project Name | Syed Asif". The card image is *not* set here: the
 * sibling `opengraph-image.tsx` already supplies a generated 1200x630 card
 * and Next injects it (hashed) automatically — `hasFileConventionImage`
 * only tells `buildPageMetadata` to widen the Twitter card accordingly.
 *
 * A draft being previewed gets `noIndex`: draft mode renders unpublished
 * content at a real URL, and the one thing that must never happen is a
 * crawler catching an unfinished project there.
 */
export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();
  const [project, profile] = await Promise.all([
    isPreview ? fetchProjectBySlugForPreview(slug) : getProjectBySlug(slug),
    getProfile(),
  ]);

  if (!project) return {};

  const name = profile?.full_name ?? DEFAULT_WORDMARK;

  return buildPageMetadata({
    title: project.name,
    description: project.short_description ?? project.description,
    path: `/projects/${project.slug}`,
    siteName: name,
    type: "article",
    hasFileConventionImage: true,
    noIndex: isPreview,
  });
}

/**
 * Every block below renders only if its data exists (CLAUDE.md's "content
 * is never hard-coded" cuts both ways — a missing field isn't padded out
 * with placeholder copy, it's just omitted). A project with only a name
 * and a description still gets a deliberate-looking page: the header
 * always has a logo (real or the initials fallback) and a status badge
 * (status always has a DB default, never null), Overview carries the
 * actual content, and the footer nav always renders since it depends on
 * *other* projects, not this one's completeness — verified with exactly
 * that minimal case, not just assumed to work.
 *
 * Structure (Phase 22): the project itself is an `<article>`; the prev/next
 * links are a `<nav>` *outside* it, since they're about other projects, not
 * this one. Each block inside is a `<section>` named by its own heading via
 * `aria-labelledby`, so a screen reader's landmark list reads "Overview",
 * "Technologies", "Key Features" rather than four unlabelled regions.
 */
export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();

  const [project, allProjects, profile] = await Promise.all([
    isPreview ? fetchProjectBySlugForPreview(slug) : getProjectBySlug(slug),
    getProjects(),
    getProfile(),
  ]);

  if (!project) notFound();

  const authorName = profile?.full_name ?? DEFAULT_WORDMARK;
  const dateLabel = formatOptionalDateRange(project.start_date, project.end_date, {
    end: "Completed",
    start: "Started",
  });
  const descriptionParagraphs = splitParagraphs(project.description ?? "");
  const hasContextBlocks = Boolean(project.problem_statement || project.solution || project.purpose);
  const hasActions = Boolean(project.github_url || project.demo_url);

  const ordered = selectProjects(allProjects);
  const currentIndex = ordered.findIndex((p) => p.slug === project.slug);
  const previous = currentIndex > 0 ? ordered[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null;

  // Deliberately the project's own artwork rather than the generated social
  // card: Next serves that card from a hashed, build-generated URL
  // (`.../opengraph-image-<hash>/card?<hash>`) that can't be reconstructed
  // here — the un-hashed path 404s, verified directly — and structured data
  // pointing at a dead image is worse than structured data with no image.
  const jsonLdImage = project.cover_image_url ?? project.logo_url;
  const graph = jsonLdGraph(
    buildProjectJsonLd({
      project,
      authorName,
      imageUrl: jsonLdImage ? absoluteUrl(jsonLdImage) : undefined,
    }),
    buildBreadcrumbJsonLd([
      { name: authorName, path: "/" },
      { name: "Projects", path: "/projects" },
      { name: project.name, path: `/projects/${project.slug}` },
    ]),
  );

  return (
    <>
      {isPreview ? <DraftPreviewBanner /> : null}
      {/* A draft preview is noindex anyway; emitting structured data for content that isn't public would be describing a page no crawler should see. */}
      {isPreview ? null : <JsonLd data={graph} />}
      <Container className="flex flex-col gap-10 py-(--space-section-y)">
      <Button asChild variant="ghost" size="sm" leadingIcon={ArrowLeft} className="w-fit">
        <Link href="/projects">Back to projects</Link>
      </Button>

      <article className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <ProjectCardImage
          src={project.logo_url}
          name={project.name}
          className="size-20 shrink-0 sm:size-24"
          sizes="96px"
          priority
        />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1 font-display font-bold text-foreground">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>

          {project.short_description ? (
            <p className="max-w-prose text-body-lg text-foreground-secondary">{project.short_description}</p>
          ) : null}

          {dateLabel ? <p className="text-small text-foreground-muted">{dateLabel}</p> : null}

          {hasActions ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {project.github_url ? (
                <Button asChild variant="secondary" leadingIcon={FolderGit2}>
                  <a href={project.github_url} target="_blank" rel="noreferrer noopener">
                    View source on GitHub
                  </a>
                </Button>
              ) : null}
              {project.demo_url ? (
                <Button asChild trailingIcon={ExternalLink}>
                  <a href={project.demo_url} target="_blank" rel="noreferrer noopener">
                    Open live demo
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Overview */}
      {descriptionParagraphs.length > 0 ? (
        <section aria-labelledby="project-overview" className="flex flex-col gap-4">
          <h2 id="project-overview" className="text-h3 font-display font-semibold text-foreground">
            Overview
          </h2>
          <div className="flex max-w-prose flex-col gap-4">
            {descriptionParagraphs.map((paragraph, index) => (
              <p key={index} className="text-body-lg text-foreground-secondary">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {/* Problem / Solution / Purpose */}
      {hasContextBlocks ? (
        <div className="flex flex-col gap-8">
          {project.problem_statement ? (
            <ContextBlock id="project-problem" label="The Problem" text={project.problem_statement} />
          ) : null}
          {project.solution ? (
            <ContextBlock id="project-solution" label="The Solution" text={project.solution} />
          ) : null}
          {project.purpose ? (
            <ContextBlock id="project-purpose" label="Purpose" text={project.purpose} />
          ) : null}
        </div>
      ) : null}

      {/* Technologies */}
      {project.technologies.length > 0 ? (
        <section aria-labelledby="project-technologies" className="flex flex-col gap-4">
          <h2 id="project-technologies" className="text-h3 font-display font-semibold text-foreground">
            Technologies
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((technology) => (
              <Tag key={technology.id}>{technology.name}</Tag>
            ))}
          </div>
        </section>
      ) : null}

      {/* Key Features */}
      {project.features.length > 0 ? (
        <section aria-labelledby="project-features" className="flex flex-col gap-4">
          <h2 id="project-features" className="text-h3 font-display font-semibold text-foreground">
            Key Features
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {project.features.map((feature) => (
              <Card key={feature.id} padding="md">
                <h3 className="text-body-lg font-semibold text-foreground">{feature.title}</h3>
                {feature.description ? (
                  <p className="mt-2 text-small text-foreground-muted">{feature.description}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <ProjectMediaGallery media={project.media} />
      </article>

      {/* Footer navigation */}
      <Divider />
      <nav
        aria-label="More projects"
        className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between"
      >
        {previous ? (
          <Button asChild variant="ghost" leadingIcon={ArrowLeft} className="w-full justify-start sm:w-auto">
            <Link href={`/projects/${previous.slug}`}>
              <span className="sr-only">Previous project: </span>
              {previous.name}
            </Link>
          </Button>
        ) : (
          <span aria-hidden="true" className="hidden sm:block" />
        )}

        <Button asChild variant="outline" size="sm">
          <Link href="/projects">All Projects</Link>
        </Button>

        {next ? (
          <Button asChild variant="ghost" trailingIcon={ArrowRight} className="w-full justify-end sm:w-auto">
            <Link href={`/projects/${next.slug}`}>
              <span className="sr-only">Next project: </span>
              {next.name}
            </Link>
          </Button>
        ) : (
          <span aria-hidden="true" className="hidden sm:block" />
        )}
      </nav>
      </Container>
    </>
  );
}

/**
 * A labelled region rather than a bare div: each of these is a real,
 * independently-meaningful part of the case study, and `aria-labelledby`
 * gives it the same accessible name the eyebrow-styled h2 already shows.
 */
function ContextBlock({ id, label, text }: { id: string; label: string; text: string }) {
  const paragraphs = splitParagraphs(text);

  return (
    <section aria-labelledby={id} className="flex max-w-prose flex-col gap-3">
      <h2 id={id} className="text-caption font-medium uppercase tracking-wider text-accent">
        {label}
      </h2>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-body text-foreground-secondary">
          {paragraph}
        </p>
      ))}
    </section>
  );
}
