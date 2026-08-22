import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchEducationByIdForAdmin } from "@/lib/data/education";
import { EntityFormPageShell } from "@/components/admin/EntityFormPageShell";
import { EducationForm } from "@/components/admin/education/EducationForm";

export const metadata: Metadata = { title: "Edit Education Entry" };

interface EditEducationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEducationPage({ params }: EditEducationPageProps) {
  const { id } = await params;
  const education = await fetchEducationByIdForAdmin(id);

  if (!education) notFound();

  return (
    <EntityFormPageShell title={`Edit ${education.institution}`} description="Update this education entry.">
      <EducationForm education={education} defaultDisplayOrder={education.display_order} />
    </EntityFormPageShell>
  );
}
