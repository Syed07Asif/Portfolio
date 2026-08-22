import type { Metadata } from "next";
import { fetchSkillCategoriesWithSkillsForAdmin } from "@/lib/data/skills";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { SkillForm } from "@/components/admin/skills/SkillForm";

export const metadata: Metadata = { title: "New Skill" };

interface NewSkillPageProps {
  /** `?category=<id>` — set when arriving via a specific category's "Add skill" link (SkillCategorySection), preselecting that category instead of leaving the admin to pick one. */
  searchParams: Promise<{ category?: string }>;
}

export default async function NewSkillPage({ searchParams }: NewSkillPageProps) {
  const { category } = await searchParams;
  const categories = await fetchSkillCategoriesWithSkillsForAdmin();
  const defaultCategory = categories.find((candidate) => candidate.id === category);

  return (
    <EntityFormPageShell title="New skill" description="Add a skill to one of your categories.">
      <SkillForm
        categories={categories}
        defaultCategoryId={defaultCategory?.id}
        defaultDisplayOrder={defaultCategory?.skills.length ?? 0}
      />
    </EntityFormPageShell>
  );
}
