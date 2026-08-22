import { Badge, Card, Tag } from "@/components/ui";
import { ProjectCardImage } from "./ProjectCardImage";
import type { Project } from "@/types/content";

const MAX_VISIBLE_TECHNOLOGIES = 4;

export interface ProjectCardProps {
  project: Project;
  /**
   * Semantic level for the card's title. Defaults to 3, which is correct
   * inside the homepage's Projects section (whose own SectionHeading is an
   * h2). The `/projects` index has no section heading between its h1 and
   * these cards, so it passes 2 rather than letting the document skip a
   * level. Only the tag changes — the visual treatment is the same either
   * way, same contract as SectionHeading's own `level`.
   */
  headingLevel?: 2 | 3;
}

/**
 * The whole card is one link (Card's `interactive href` mode — a single
 * <a>, nothing nested inside it is itself focusable) named by its own
 * visible title via `aria-labelledby`, so its accessible name is just the
 * project name rather than every visible string on the card concatenated
 * (the image alt, the description, every tech tag).
 *
 * `aria-labelledby` specifically, **not** `aria-label` — that was the
 * original approach and Phase 24's axe run failed it under
 * `label-content-name-mismatch` (WCAG 2.5.3, "Label in Name"): an
 * `aria-label` *replaces* the accessible name with a string that the
 * assistive-tech user cannot tie back to the visible text, which breaks
 * voice control ("click Customer Churn Prediction" has to match something).
 * Pointing at the real heading element keeps the name short *and* makes it
 * literally identical to the visible title.
 *
 * Deliberately no status badge: between the logo, the optional featured
 * badge, the description, and the tech tags, a fifth piece of metadata was
 * more likely to clip the "don't clutter the card" instruction than add
 * anything — status is one tap away on the detail page instead.
 */
export function ProjectCard({ project, headingLevel = 3 }: ProjectCardProps) {
  const technologies = project.technologies.slice(0, MAX_VISIBLE_TECHNOLOGIES);
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const titleId = `project-card-${project.slug}-title`;

  return (
    <Card
      interactive
      href={`/projects/${project.slug}`}
      hover="lift"
      padding="lg"
      aria-labelledby={titleId}
      className={
        project.featured
          ? "group flex h-full flex-col gap-4 ring-1 ring-accent/40"
          : "group flex h-full flex-col gap-4"
      }
    >
      <div className="relative">
        <ProjectCardImage src={project.logo_url} name={project.name} />
        {project.featured ? (
          <Badge variant="accent" className="absolute top-3 right-3 shadow-sm">
            Featured
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Heading id={titleId} className="text-h4 font-display font-semibold text-foreground">
          {project.name}
        </Heading>

        {project.short_description ? (
          <p className="line-clamp-2 text-small text-foreground-muted">{project.short_description}</p>
        ) : null}

        {technologies.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {technologies.map((technology) => (
              <Tag key={technology.id} variant="subtle">
                {technology.name}
              </Tag>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
