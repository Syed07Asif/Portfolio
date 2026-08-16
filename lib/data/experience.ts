import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Experience } from "@/types/content";
import { logDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchExperience(): Promise<Experience[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("experience")
    .select(
      "id, company, role, company_logo_url, location, employment_type, start_date, end_date, is_current, description, responsibilities, technologies, link_url, display_order",
    )
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("start_date", { ascending: false });

  if (error) {
    logDataError("getExperience", error);
    return [];
  }
  return data ?? [];
}

export const getExperience = unstable_cache(fetchExperience, ["experience"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.experience],
});
