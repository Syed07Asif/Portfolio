import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Achievement } from "@/types/content";
import { handleDataError } from "./shared";

const ADMIN_ACHIEVEMENT_COLUMNS =
  "id, title, description, date, organization, image_url, document_url, external_link, display_order, published";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchAchievements(): Promise<Achievement[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("achievements")
    .select(
      "id, title, description, date, organization, image_url, document_url, external_link, display_order",
    )
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("date", { ascending: false });

  if (error) {
    handleDataError("getAchievements", error);
    return [];
  }
  return data ?? [];
}

export const getAchievements = unstable_cache(fetchAchievements, ["achievements"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.achievements],
});

/** The admin list/form shape — Achievement plus published, which every public consumer already knows is true by construction. */
export type AdminAchievement = Achievement & { published: boolean };

/** Admin-only read — every row (draft and published). See fetchEducationForAdmin's doc comment for why this isn't wrapped in unstable_cache. */
export async function fetchAchievementsForAdmin(): Promise<AdminAchievement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achievements")
    .select(ADMIN_ACHIEVEMENT_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    handleDataError("fetchAchievementsForAdmin", error);
    return [];
  }
  return data ?? [];
}

/** Single-row admin read for the edit page — draft or published. */
export async function fetchAchievementByIdForAdmin(id: string): Promise<AdminAchievement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achievements")
    .select(ADMIN_ACHIEVEMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    handleDataError(`fetchAchievementByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}
