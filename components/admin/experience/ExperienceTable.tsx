"use client";

import { BriefcaseIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateRange } from "@/lib/utils";
import {
  deleteExperience,
  reorderExperience,
  toggleExperiencePublished,
} from "@/lib/actions/experience";
import type { AdminExperience } from "@/lib/data/experience";

export interface ExperienceTableProps {
  items: AdminExperience[];
}

export function ExperienceTable({ items }: ExperienceTableProps) {
  return (
    <AdminTable
      items={items}
      entityName="experience entry"
      getItemLabel={(item) => `${item.role} at ${item.company}`}
      editHref={(item) => `/admin/experience/${item.id}/edit`}
      onReorder={reorderExperience}
      onTogglePublished={(item, published) => toggleExperiencePublished(item.id, published)}
      onDelete={(item) => deleteExperience(item.id)}
      columns={[
        {
          key: "company",
          header: "Company",
          render: (item) => <span className="font-medium text-foreground">{item.company}</span>,
        },
        { key: "role", header: "Role", render: (item) => item.role },
        {
          key: "dates",
          header: "Dates",
          render: (item) => formatDateRange(item.start_date, item.end_date, item.is_current),
        },
      ]}
      emptyState={
        <EmptyState
          icon={BriefcaseIcon}
          title="No experience entries yet"
          description="Add your first role to show it on the public site's timeline."
          createHref="/admin/experience/new"
          createLabel="Add experience"
        />
      }
    />
  );
}
