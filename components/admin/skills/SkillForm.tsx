"use client";

import { useAdminForm } from "@/components/admin/form/useAdminForm";
import { AdminFormShell } from "@/components/admin/form/AdminFormShell";
import { NumberField, SelectField, SwitchField, TextField } from "@/components/admin/form/fields";
import { skillSchema, type SkillInput } from "@/lib/validation";
import { createSkill, updateSkill } from "@/lib/actions/skills";
import type { AdminSkill } from "@/lib/data/skills";
import type { SkillCategory } from "@/types/content";

export interface SkillFormProps {
  /** Omitted for the create form. */
  skill?: AdminSkill;
  categories: SkillCategory[];
  /** Preselects the category when arriving from a specific category's "Add skill" link. */
  defaultCategoryId?: string;
  defaultDisplayOrder: number;
}

export function SkillForm({ skill, categories, defaultCategoryId, defaultDisplayOrder }: SkillFormProps) {
  const defaultValues: SkillInput = {
    category_id: skill?.category_id ?? defaultCategoryId ?? "",
    name: skill?.name ?? "",
    icon: skill?.icon ?? "",
    proficiency: skill?.proficiency ?? null,
    display_order: skill?.display_order ?? defaultDisplayOrder,
    published: skill?.published ?? false,
  };

  const { form, isPending, onValid } = useAdminForm({
    schema: skillSchema,
    defaultValues,
    onSubmit: (values) => (skill ? updateSkill(skill.id, values) : createSkill(values)),
    successMessage: skill ? "Skill updated." : "Skill created.",
    redirectTo: "/admin/skills",
  });

  return (
    <AdminFormShell
      form={form}
      onValid={onValid}
      isPending={isPending}
      submitLabel={skill ? "Save changes" : "Create"}
      cancelHref="/admin/skills"
    >
      <SelectField
        control={form.control}
        name="category_id"
        label="Category"
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        disabled={isPending}
      />

      <TextField control={form.control} name="name" label="Name" />

      <TextField
        control={form.control}
        name="icon"
        label="Icon"
        description="Optional. Not yet shown on the public site — skills currently render as plain text chips — reserved for a future per-skill icon."
      />

      <NumberField
        control={form.control}
        name="proficiency"
        label="Proficiency"
        min={0}
        max={100}
        allowEmpty
        description="Optional, 0–100. Shown as a fill bar under the skill chip when set."
      />

      <NumberField control={form.control} name="display_order" label="Display order" min={0} />

      <SwitchField
        control={form.control}
        name="published"
        label="Published"
        description="Visible on the public site's Skills section."
      />
    </AdminFormShell>
  );
}
