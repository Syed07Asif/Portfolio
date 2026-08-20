import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchAchievementByIdForAdmin } from "@/lib/data/achievements";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { AchievementForm } from "@/components/admin/achievements/AchievementForm";

export const metadata: Metadata = { title: "Edit Achievement" };

interface EditAchievementPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAchievementPage({ params }: EditAchievementPageProps) {
  const { id } = await params;
  const achievement = await fetchAchievementByIdForAdmin(id);

  if (!achievement) notFound();

  return (
    <EntityFormPageShell title={`Edit ${achievement.title}`} description="Update this achievement.">
      <AchievementForm achievement={achievement} defaultDisplayOrder={achievement.display_order} />
    </EntityFormPageShell>
  );
}
