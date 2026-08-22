import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchExperienceByIdForAdmin } from "@/lib/data/experience";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { ExperienceForm } from "@/components/admin/experience/ExperienceForm";

export const metadata: Metadata = { title: "Edit Experience Entry" };

interface EditExperiencePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExperiencePage({ params }: EditExperiencePageProps) {
  const { id } = await params;
  const experience = await fetchExperienceByIdForAdmin(id);

  if (!experience) notFound();

  return (
    <EntityFormPageShell title={`Edit ${experience.role} at ${experience.company}`} description="Update this experience entry.">
      <ExperienceForm experience={experience} defaultDisplayOrder={experience.display_order} />
    </EntityFormPageShell>
  );
}
