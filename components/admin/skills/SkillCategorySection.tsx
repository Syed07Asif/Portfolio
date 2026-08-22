"use client";

import Link from "next/link";
import { PlusIcon, SparklesIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/admin/ui/button";
import { deleteSkill, reorderSkills, toggleSkillPublished } from "@/lib/actions/skills";
import { BulkSkillAdd } from "./BulkSkillAdd";
import type { AdminSkillCategory } from "@/lib/data/skills";

export interface SkillCategorySectionProps {
  category: AdminSkillCategory;
}

/** One category's own skills list — bulk-add box, then the standard AdminTable (reorder/publish/edit/delete), scoped to just this category's rows. */
export function SkillCategorySection({ category }: SkillCategorySectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-h4 font-semibold text-foreground">{category.name}</h3>
          {category.description ? <p className="text-small text-foreground-muted">{category.description}</p> : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/skills/new?category=${category.id}`}>
            <PlusIcon className="size-4" /> Add skill
          </Link>
        </Button>
      </div>

      <BulkSkillAdd categoryId={category.id} />

      <AdminTable
        items={category.skills}
        entityName="skill"
        getItemLabel={(item) => item.name}
        editHref={(item) => `/admin/skills/${item.id}/edit`}
        onReorder={reorderSkills}
        onTogglePublished={(item, published) => toggleSkillPublished(item.id, published)}
        onDelete={(item) => deleteSkill(item.id)}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (item) => <span className="font-medium text-foreground">{item.name}</span>,
          },
          {
            key: "proficiency",
            header: "Proficiency",
            render: (item) => (item.proficiency !== null ? `${item.proficiency}%` : "—"),
          },
        ]}
        emptyState={
          <EmptyState
            icon={SparklesIcon}
            title="No skills in this category yet"
            description="Use the quick-add box above, or add one skill at a time."
            createHref={`/admin/skills/new?category=${category.id}`}
            createLabel="Add skill"
          />
        }
      />
    </div>
  );
}
