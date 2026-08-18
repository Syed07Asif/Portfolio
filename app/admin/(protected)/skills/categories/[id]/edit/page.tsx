import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchSkillCategoryByIdForAdmin } from "@/lib/data/skills";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { SkillCategoryForm } from "@/components/admin/skills/SkillCategoryForm";

export const metadata: Metadata = { title: "Edit Skill Category" };

interface EditSkillCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSkillCategoryPage({ params }: EditSkillCategoryPageProps) {
  const { id } = await params;
  const category = await fetchSkillCategoryByIdForAdmin(id);

  if (!category) notFound();

  return (
    <EntityFormPageShell title={`Edit ${category.name}`} description="Update this skill category.">
      <SkillCategoryForm category={category} defaultDisplayOrder={category.display_order} />
    </EntityFormPageShell>
  );
}
