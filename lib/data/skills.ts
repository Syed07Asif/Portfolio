import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { SkillCategory, SkillCategoryWithSkills } from "@/types/content";
import { logDataError } from "./shared";

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
    logDataError("getSkillCategoriesWithSkills", error);
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
