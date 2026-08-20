import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, FolderGit2 } from "lucide-react";
import { Button, Card, Container, Divider, Tag } from "@/components/ui";
import { getProjectBySlug, getProjectSlugs, getProjects } from "@/lib/data";
import { fetchProjectBySlugForPreview } from "@/lib/data/projects";
import { selectProjects } from "@/lib/projects";
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

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();
  const project = isPreview ? await fetchProjectBySlugForPreview(slug) : await getProjectBySlug(slug);

  if (!project) return {};

  const ogImage = project.cover_image_url ?? project.logo_url ?? undefined;
  const canonical = `/projects/${project.slug}`;

  return {
    title: `${project.name} — Projects`,
    description: project.short_description ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: project.name,
      description: project.short_description ?? undefined,
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
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
 */
export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();

  const [project, allProjects] = await Promise.all([
    isPreview ? fetchProjectBySlugForPreview(slug) : getProjectBySlug(slug),
    getProjects(),
  ]);

  if (!project) notFound();

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

  return (
    <>
      {isPreview ? <DraftPreviewBanner /> : null}
      <Container className="flex flex-col gap-10 py-(--space-section-y)">
      <Button asChild variant="ghost" size="sm" leadingIcon={ArrowLeft} className="w-fit">
        <Link href="/projects">Back to projects</Link>
      </Button>

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
                    GitHub
                  </a>
                </Button>
              ) : null}
              {project.demo_url ? (
                <Button asChild trailingIcon={ExternalLink}>
                  <a href={project.demo_url} target="_blank" rel="noreferrer noopener">
                    Live Demo
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Overview */}
      {descriptionParagraphs.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-h3 font-display font-semibold text-foreground">Overview</h2>
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
        <section className="flex flex-col gap-8">
          {project.problem_statement ? <ContextBlock label="The Problem" text={project.problem_statement} /> : null}
          {project.solution ? <ContextBlock label="The Solution" text={project.solution} /> : null}
          {project.purpose ? <ContextBlock label="Purpose" text={project.purpose} /> : null}
        </section>
      ) : null}

      {/* Technologies */}
      {project.technologies.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-h3 font-display font-semibold text-foreground">Technologies</h2>
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((technology) => (
              <Tag key={technology.id}>{technology.name}</Tag>
            ))}
          </div>
        </section>
      ) : null}

      {/* Key Features */}
      {project.features.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-h3 font-display font-semibold text-foreground">Key Features</h2>
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

      {/* Footer navigation */}
      <Divider />
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        {previous ? (
          <Button asChild variant="ghost" leadingIcon={ArrowLeft} className="w-full justify-start sm:w-auto">
            <Link href={`/projects/${previous.slug}`}>{previous.name}</Link>
          </Button>
        ) : (
          <span aria-hidden="true" className="hidden sm:block" />
        )}

        <Button asChild variant="outline" size="sm">
          <Link href="/projects">All Projects</Link>
        </Button>

        {next ? (
          <Button asChild variant="ghost" trailingIcon={ArrowRight} className="w-full justify-end sm:w-auto">
            <Link href={`/projects/${next.slug}`}>{next.name}</Link>
          </Button>
        ) : (
          <span aria-hidden="true" className="hidden sm:block" />
        )}
      </div>
      </Container>
    </>
  );
}

function ContextBlock({ label, text }: { label: string; text: string }) {
  const paragraphs = splitParagraphs(text);

  return (
    <div className="flex max-w-prose flex-col gap-3">
      <h2 className="text-caption font-medium uppercase tracking-wider text-accent">{label}</h2>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-body text-foreground-secondary">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
