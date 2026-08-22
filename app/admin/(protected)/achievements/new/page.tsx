import type { Metadata } from "next";
import { fetchAchievementsForAdmin } from "@/lib/data/achievements";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { AchievementForm } from "@/components/admin/achievements/AchievementForm";

export const metadata: Metadata = { title: "New Achievement" };

export default async function NewAchievementPage() {
  const items = await fetchAchievementsForAdmin();

  return (
    <EntityFormPageShell title="New achievement" description="Add an award, publication, or talk.">
      <AchievementForm defaultDisplayOrder={items.length} />
    </EntityFormPageShell>
  );
}
