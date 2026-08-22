import { updateTag, revalidatePath } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";

/**
 * Categories and skills render together in exactly one place — the
 * homepage's Skills section (components/sections/Skills.tsx, driven by
 * getSkillCategoriesWithSkills(), which selects both tables in one query)
 * — so both entities' actions share this one revalidation helper rather
 * than each having their own near-identical copy. See
 * docs/content-management.md's cache-invalidation table.
 *
 * Deliberately NOT defined inside lib/actions/skillCategories.ts (a
 * `"use server"` file) even though it's only ever called from there and
 * lib/actions/skills.ts: every function *exported* from a `"use server"`
 * module must itself be an async Server Action (Next enforces this at
 * build time) — education.ts's equivalent `revalidateEducation()` gets
 * away with being sync only because it's private to that one file, never
 * exported. Sharing this one across two action files means it has to live
 * in a plain module instead, the same reason lib/actions/shared.ts itself
 * carries no `"use server"` directive.
 */
export function revalidateSkills() {
  updateTag(CACHE_TAGS.skills);
  revalidatePath("/");
}
