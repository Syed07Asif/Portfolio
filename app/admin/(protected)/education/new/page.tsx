import type { Metadata } from "next";
import { fetchEducationForAdmin } from "@/lib/data/education";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { EducationForm } from "@/components/admin/education/EducationForm";

export const metadata: Metadata = { title: "New Education Entry" };

export default async function NewEducationPage() {
  const items = await fetchEducationForAdmin();

  return (
    <EntityFormPageShell title="New education entry" description="Add a degree, certification, or coursework.">
      <EducationForm defaultDisplayOrder={items.length} />
    </EntityFormPageShell>
  );
}
