import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Achievement } from "@/types/content";
import { logDataError } from "./shared";

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
    logDataError("getAchievements", error);
    return [];
  }
  return data ?? [];
}

export const getAchievements = unstable_cache(fetchAchievements, ["achievements"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.achievements],
});
