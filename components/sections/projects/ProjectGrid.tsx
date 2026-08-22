import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { selectProjects } from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";
import type { Project } from "@/types/content";

export interface ProjectGridProps {
  /** The full fetched list — filtering/sorting/slicing happens in here via selectProjects, not by the caller. */
  projects: Project[];
  featuredOnly?: boolean;
  limit?: number;
  /** Passed straight through to each ProjectCard's title — see its own prop doc for why the two callers differ. */
  cardHeadingLevel?: 2 | 3;
}

/**
 * Shared by the homepage's Projects section and the /projects index page.
 * `featuredOnly`/`limit` (and, later, category/search — see
 * lib/projects.ts) all flow through `selectProjects`, the one pure
 * sort/filter function, so this component itself never hand-rolls sorting
 * logic.
 */
export function ProjectGrid({ projects, featuredOnly, limit, cardHeadingLevel }: ProjectGridProps) {
  const items = selectProjects(projects, { featuredOnly, limit });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Published projects will show up here once they're added."
      />
    );
  }

  return (
    <div
      className="reveal-group grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((project) => (
        <div key={project.id}>
          <ProjectCard project={project} headingLevel={cardHeadingLevel} />
        </div>
      ))}
    </div>
  );
}
