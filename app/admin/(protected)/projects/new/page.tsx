import type { Metadata } from "next";
import { fetchProjectsForAdmin, fetchProjectTechnologyNames } from "@/lib/data/projects";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";

export const metadata: Metadata = { title: "New Project" };

export default async function NewProjectPage() {
  const [items, technologySuggestions] = await Promise.all([fetchProjectsForAdmin(), fetchProjectTechnologyNames()]);

  return (
    <EntityFormPageShell
      title="New project"
      description="Add a project. Save anytime as a draft — publishing is a separate step once it's ready."
    >
      <ProjectForm defaultDisplayOrder={items.length} technologySuggestions={technologySuggestions} />
    </EntityFormPageShell>
  );
}
