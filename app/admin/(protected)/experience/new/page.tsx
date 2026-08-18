import type { Metadata } from "next";
import { fetchExperienceForAdmin } from "@/lib/data/experience";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { ExperienceForm } from "@/components/admin/experience/ExperienceForm";

export const metadata: Metadata = { title: "New Experience Entry" };

export default async function NewExperiencePage() {
  const items = await fetchExperienceForAdmin();

  return (
    <EntityFormPageShell title="New experience entry" description="Add a role to the public timeline.">
      <ExperienceForm defaultDisplayOrder={items.length} />
    </EntityFormPageShell>
  );
}
