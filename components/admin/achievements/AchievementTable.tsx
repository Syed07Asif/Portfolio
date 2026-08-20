"use client";

import { TrophyIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatMonthYear } from "@/lib/utils";
import { deleteAchievement, reorderAchievements, toggleAchievementPublished } from "@/lib/actions/achievements";
import type { AdminAchievement } from "@/lib/data/achievements";

export interface AchievementTableProps {
  items: AdminAchievement[];
}

export function AchievementTable({ items }: AchievementTableProps) {
  return (
    <AdminTable
      items={items}
      entityName="achievement"
      getItemLabel={(item) => item.title}
      editHref={(item) => `/admin/achievements/${item.id}/edit`}
      onReorder={reorderAchievements}
      onTogglePublished={(item, published) => toggleAchievementPublished(item.id, published)}
      onDelete={(item) => deleteAchievement(item.id)}
      columns={[
        {
          key: "title",
          header: "Title",
          render: (item) => <span className="font-medium text-foreground">{item.title}</span>,
        },
        { key: "organization", header: "Organization", render: (item) => item.organization ?? "—" },
        { key: "date", header: "Date", render: (item) => (item.date ? formatMonthYear(item.date) : "—") },
      ]}
      emptyState={
        <EmptyState
          icon={TrophyIcon}
          title="No achievements yet"
          description="Add your first award, publication, or talk to show it on the public site."
          createHref="/admin/achievements/new"
          createLabel="Add achievement"
        />
      }
    />
  );
}
