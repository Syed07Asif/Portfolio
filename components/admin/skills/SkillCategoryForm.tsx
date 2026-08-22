"use client";

import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { NumberField, SlugField, TextField, TextareaField } from "@/components/admin/form/fields";
import { skillCategorySchema, type SkillCategoryInput } from "@/lib/validation";
import { createSkillCategory, updateSkillCategory } from "@/lib/actions/skillCategories";
import { SKILL_CATEGORY_ICON_SLUGS } from "./skillIcons";
import type { SkillCategory } from "@/types/content";

export interface SkillCategoryFormProps {
  /** Omitted for the create form. */
  category?: SkillCategory;
  defaultDisplayOrder: number;
}

export function SkillCategoryForm({ category, defaultDisplayOrder }: SkillCategoryFormProps) {
  const defaultValues: SkillCategoryInput = {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "",
    display_order: category?.display_order ?? defaultDisplayOrder,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: skillCategorySchema,
    defaultValues,
    onSubmit: (values) => (category ? updateSkillCategory(category.id, values) : createSkillCategory(values)),
    successMessage: category ? "Category updated." : "Category created.",
    redirectTo: "/admin/skills",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={category ? "Save changes" : "Create"}
      cancelHref="/admin/skills"
    >
      <TextField control={form.control} name="name" label="Name" />

      <SlugField control={form.control} name="slug" sourceName="name" disabled={isPending} />

      <TextareaField control={form.control} name="description" label="Description" rows={3} />

      <TextField
        control={form.control}
        name="icon"
        label="Icon"
        placeholder="e.g. brain-circuit"
        description={`Optional. Shown next to the category name on the public Skills section — recognized slugs: ${SKILL_CATEGORY_ICON_SLUGS.join(", ")}. Anything else falls back to a generic icon.`}
      />

      <NumberField control={form.control} name="display_order" label="Display order" min={0} />
    </AdminFormShell>
  );
}
