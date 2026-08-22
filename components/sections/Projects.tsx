import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, Section, SectionHeading } from "@/components/ui";
import { getProjects } from "@/lib/data";
import { SECTION_IDS } from "@/lib/constants";
import { ProjectGrid } from "./projects/ProjectGrid";

const HOMEPAGE_PROJECT_LIMIT = 6;

/**
 * Server component: one getProjects() call (cached) serves both this
 * section and the featured/fallback decision below — no separate
 * featured-only query. Shows featured projects if any exist; otherwise
 * falls back to the most prominent published projects by display_order
 * (the list projection has no date field to sort "most recent" by, so
 * display_order — which an admin curates anyway — is the closest available
 * proxy).
 */
export async function Projects() {
  const projects = await getProjects();

  if (projects.length === 0) return null;

  const hasFeatured = projects.some((project) => project.featured);

  return (
    <Section id={SECTION_IDS.projects} labelledBy={`${SECTION_IDS.projects}-heading`}>
      <SectionHeading
        eyebrow="Selected Work"
        heading="Projects"
        headingId={`${SECTION_IDS.projects}-heading`}
        action={
          <Button asChild variant="outline" trailingIcon={ArrowRight}>
            <Link href="/projects">View all projects</Link>
          </Button>
        }
      />
      <ProjectGrid projects={projects} featuredOnly={hasFeatured} limit={HOMEPAGE_PROJECT_LIMIT} />
    </Section>
  );
}
