import type { Metadata } from "next";
import { fetchSkillCategoriesForAdmin } from "@/lib/data/skills";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { SkillCategoryForm } from "@/components/admin/skills/SkillCategoryForm";

export const metadata: Metadata = { title: "New Skill Category" };

export default async function NewSkillCategoryPage() {
  const categories = await fetchSkillCategoriesForAdmin();

  return (
    <EntityFormPageShell title="New skill category" description="e.g. Languages, Frameworks, Tools.">
      <SkillCategoryForm defaultDisplayOrder={categories.length} />
    </EntityFormPageShell>
  );
}
