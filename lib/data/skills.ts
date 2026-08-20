import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { SkillCategory, SkillCategoryWithSkills } from "@/types/content";
import { handleDataError } from "./shared";

type SkillCategoryRow = SkillCategory & {
  skills: {
    id: string;
    name: string;
    icon: string | null;
    proficiency: number | null;
    display_order: number;
  }[];
};

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchSkillCategoriesWithSkills(): Promise<SkillCategoryWithSkills[]> {
  const supabase = createStaticClient();
  // RLS already restricts the embedded `skills` rows to published = true —
  // no extra filter needed here.
  const { data, error } = await supabase
    .from("skill_categories")
    .select(
      `id, name, slug, description, icon, display_order,
       skills ( id, name, icon, proficiency, display_order )`,
    )
    .order("display_order", { ascending: true })
    .order("display_order", { referencedTable: "skills", ascending: true });

  if (error) {
    handleDataError("getSkillCategoriesWithSkills", error);
    return [];
  }

  const rows = (data ?? []) as unknown as SkillCategoryRow[];

  return rows.map(({ skills, ...category }) => ({
    ...category,
    skills: skills.map((skill) => ({ ...skill, category })),
  }));
}

export const getSkillCategoriesWithSkills = unstable_cache(
  fetchSkillCategoriesWithSkills,
  ["skill-categories-with-skills"],
  { revalidate: 3600, tags: [CACHE_TAGS.skills] },
);

/** The admin list/form shape for a skill — unlike `SkillWithCategory` (types/content.ts), this carries `category_id` and `published` directly rather than a nested `category` object, since the admin table/form needs to filter/reassign by id and toggle publish. */
export type AdminSkill = {
  id: string;
  category_id: string;
  name: string;
  icon: string | null;
  proficiency: number | null;
  display_order: number;
  published: boolean;
};

export type AdminSkillCategory = SkillCategory & { skills: AdminSkill[] };

const ADMIN_SKILL_CATEGORY_COLUMNS = "id, name, slug, description, icon, display_order";
const ADMIN_SKILL_COLUMNS = "id, category_id, name, icon, proficiency, display_order, published";

/**
 * Admin-only read for the /admin/skills screen: every category with every
 * skill it owns, draft and published alike (unlike fetchSkillCategoriesWithSkills,
 * which relies on RLS to only ever return published skills). Cookie-aware
 * `createClient()`, not cached — same reasoning as fetchEducationForAdmin.
 */
export async function fetchSkillCategoriesWithSkillsForAdmin(): Promise<AdminSkillCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skill_categories")
    .select(`${ADMIN_SKILL_CATEGORY_COLUMNS}, skills ( ${ADMIN_SKILL_COLUMNS} )`)
    .order("display_order", { ascending: true })
    .order("display_order", { referencedTable: "skills", ascending: true });

  if (error) {
    handleDataError("fetchSkillCategoriesWithSkillsForAdmin", error);
    return [];
  }

  return (data ?? []) as unknown as AdminSkillCategory[];
}

/** Categories only, no nested skills — used by SkillForm's "Category" select and the delete-choice dialog's "move to" target list. */
export async function fetchSkillCategoriesForAdmin(): Promise<SkillCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skill_categories")
    .select(ADMIN_SKILL_CATEGORY_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    handleDataError("fetchSkillCategoriesForAdmin", error);
    return [];
  }
  return data ?? [];
}

export async function fetchSkillCategoryByIdForAdmin(id: string): Promise<SkillCategory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skill_categories")
    .select(ADMIN_SKILL_CATEGORY_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    handleDataError(`fetchSkillCategoryByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}

export async function fetchSkillByIdForAdmin(id: string): Promise<AdminSkill | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("skills").select(ADMIN_SKILL_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    handleDataError(`fetchSkillByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}
