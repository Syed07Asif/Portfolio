import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchSkillByIdForAdmin, fetchSkillCategoriesForAdmin } from "@/lib/data/skills";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { SkillForm } from "@/components/admin/skills/SkillForm";

export const metadata: Metadata = { title: "Edit Skill" };

interface EditSkillPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSkillPage({ params }: EditSkillPageProps) {
  const { id } = await params;
  const [skill, categories] = await Promise.all([fetchSkillByIdForAdmin(id), fetchSkillCategoriesForAdmin()]);

  if (!skill) notFound();

  return (
    <EntityFormPageShell title={`Edit ${skill.name}`} description="Update this skill.">
      <SkillForm skill={skill} categories={categories} defaultDisplayOrder={skill.display_order} />
    </EntityFormPageShell>
  );
}
