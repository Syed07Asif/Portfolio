"use client";

import { GraduationCapIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatOptionalDateRange } from "@/lib/utils";
import { deleteEducation, duplicateEducation, reorderEducation, toggleEducationPublished } from "@/lib/actions/education";
import type { AdminEducation } from "@/lib/data/education";

export interface EducationTableProps {
  items: AdminEducation[];
}

export function EducationTable({ items }: EducationTableProps) {
  return (
    <AdminTable
      items={items}
      entityName="education entry"
      getItemLabel={(item) => item.institution}
      editHref={(item) => `/admin/education/${item.id}/edit`}
      onReorder={reorderEducation}
      onTogglePublished={(item, published) => toggleEducationPublished(item.id, published)}
      onDelete={(item) => deleteEducation(item.id)}
      onDuplicate={(item) => duplicateEducation(item.id)}
      columns={[
        {
          key: "institution",
          header: "Institution",
          render: (item) => <span className="font-medium text-foreground">{item.institution}</span>,
        },
        { key: "degree", header: "Degree", render: (item) => item.degree },
        {
          key: "dates",
          header: "Dates",
          render: (item) =>
            formatOptionalDateRange(item.start_date, item.end_date, { start: "Started", end: "Graduated" }) ?? "—",
        },
      ]}
      emptyState={
        <EmptyState
          icon={GraduationCapIcon}
          title="No education entries yet"
          description="Add your first degree or certification to show it on the public site."
          createHref="/admin/education/new"
          createLabel="Add education"
        />
      }
    />
  );
}
