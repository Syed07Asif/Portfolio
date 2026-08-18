import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { getProfile, getProjects } from "@/lib/data";
import { DEFAULT_WORDMARK } from "@/lib/constants";
import { ProjectGrid } from "@/components/sections/projects/ProjectGrid";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const name = profile?.full_name ?? DEFAULT_WORDMARK;

  return {
    title: `Projects — ${name}`,
    description: `Every published project by ${name}.`,
  };
}

/**
 * The dedicated project index: every published project, unfiltered
 * (`ProjectGrid` with no `featuredOnly`/`limit`), unlike the homepage
 * section's featured/curated subset.
 */
export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <Container className="flex flex-col gap-10 py-(--space-section-y)">
      <div className="flex flex-col gap-3">
        <p className="text-caption font-medium uppercase tracking-wider text-accent">Portfolio</p>
        <h1 className="text-h1 font-display font-bold text-foreground">All Projects</h1>
        <p className="max-w-2xl text-body-lg text-foreground-secondary">
          Every published project, in one place.
        </p>
      </div>
      <ProjectGrid projects={projects} />
    </Container>
  );
}
