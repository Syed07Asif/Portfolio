import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProjectByIdForAdmin, fetchProjectTechnologyNames } from "@/lib/data/projects";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";

export const metadata: Metadata = { title: "Edit Project" };

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const [project, technologySuggestions] = await Promise.all([
    fetchProjectByIdForAdmin(id),
    fetchProjectTechnologyNames(),
  ]);

  if (!project) notFound();

  return (
    <EntityFormPageShell title={`Edit ${project.name || "project"}`} description="Update this project.">
      <ProjectForm project={project} defaultDisplayOrder={project.display_order} technologySuggestions={technologySuggestions} />
    </EntityFormPageShell>
  );
}
