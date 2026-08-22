"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayersIcon } from "lucide-react";
import { AdminTable } from "@/components/admin/table/AdminTable";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { deleteSkillCategory, reorderSkillCategories } from "@/lib/actions/skillCategories";
import type { AdminSkillCategory } from "@/lib/data/skills";

export interface SkillCategoryTableProps {
  categories: AdminSkillCategory[];
}

type Strategy = "delete-skills" | "move-skills";

/**
 * Categories can't use AdminTable's default delete confirmation — deleting
 * a category that still has skills (`skills.category_id references
 * skill_categories(id) on delete restrict`, see the migration) must warn
 * and require an explicit choice, never silently cascade or orphan. This
 * wires AdminTable's `onRequestDelete` escape hatch (see that component's
 * own doc comment) to a dialog built here instead of AdminTable's own
 * generic one.
 */
export function SkillCategoryTable({ categories }: SkillCategoryTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AdminSkillCategory | null>(null);
  const [otherCategories, setOtherCategories] = useState<AdminSkillCategory[]>([]);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const skillCount = deleteTarget?.skills.length ?? 0;

  function openDeleteDialog(category: AdminSkillCategory) {
    const others = categories.filter((candidate) => candidate.id !== category.id);
    setOtherCategories(others);
    setStrategy(null);
    setTargetCategoryId(others[0]?.id ?? "");
    setDeleteTarget(category);
  }

  function closeDialog() {
    setDeleteTarget(null);
    setIsDeleting(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    // A category with zero skills has nothing to resolve — the strategy
    // sent to the server is a formality either branch handles as a no-op.
    const effectiveStrategy = skillCount === 0 ? "delete-skills" : strategy;
    if (!effectiveStrategy) return;

    setIsDeleting(true);
    const result = await deleteSkillCategory(
      deleteTarget.id,
      effectiveStrategy === "delete-skills"
        ? { strategy: "delete-skills" }
        : { strategy: "move-skills", targetCategoryId },
    );

    setIsDeleting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Category deleted.");
    closeDialog();
    router.refresh();
  }

  const confirmDisabled =
    isDeleting || (skillCount > 0 && (!strategy || (strategy === "move-skills" && !targetCategoryId)));

  return (
    <>
      <AdminTable
        items={categories}
        entityName="skill category"
        getItemLabel={(item) => item.name}
        editHref={(item) => `/admin/skills/categories/${item.id}/edit`}
        onReorder={reorderSkillCategories}
        onRequestDelete={openDeleteDialog}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (item) => <span className="font-medium text-foreground">{item.name}</span>,
          },
          { key: "slug", header: "Slug", render: (item) => item.slug },
          { key: "skills", header: "Skills", render: (item) => `${item.skills.length}` },
        ]}
        emptyState={
          <EmptyState
            icon={LayersIcon}
            title="No skill categories yet"
            description="Add a category (e.g. Languages, Tools) before adding skills to it."
            createHref="/admin/skills/categories/new"
            createLabel="Add category"
          />
        }
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {skillCount === 0
                ? "This permanently deletes this category. This can't be undone."
                : `This category still has ${skillCount} skill${skillCount === 1 ? "" : "s"}. Choose what happens to ${
                    skillCount === 1 ? "it" : "them"
                  } before deleting the category.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {skillCount > 0 ? (
            <div className="flex flex-col gap-3 text-small text-foreground">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="delete-strategy"
                  checked={strategy === "delete-skills"}
                  onChange={() => setStrategy("delete-skills")}
                  className="mt-1"
                />
                <span>
                  Delete {skillCount === 1 ? "that skill" : `all ${skillCount} skills`} along with the category
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="delete-strategy"
                  checked={strategy === "move-skills"}
                  onChange={() => setStrategy("move-skills")}
                  disabled={otherCategories.length === 0}
                  className="mt-1"
                />
                <span className="flex-1">
                  Move {skillCount === 1 ? "it" : "them"} to another category first
                  {otherCategories.length === 0 ? (
                    <span className="block text-caption text-foreground-muted">
                      No other category exists to move {skillCount === 1 ? "it" : "them"} to.
                    </span>
                  ) : (
                    <Select
                      value={targetCategoryId}
                      onValueChange={setTargetCategoryId}
                      disabled={strategy !== "move-skills"}
                    >
                      <SelectTrigger className="mt-2 w-full">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </span>
              </label>
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={confirmDisabled}
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
