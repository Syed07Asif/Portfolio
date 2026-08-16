import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Education } from "@/types/content";
import { logDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchEducation(): Promise<Education[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("education")
    .select(
      "id, institution, degree, field_of_study, institution_logo_url, start_date, end_date, grade, description, link_url, display_order",
    )
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("start_date", { ascending: false });

  if (error) {
    logDataError("getEducation", error);
    return [];
  }
  return data ?? [];
}

export const getEducation = unstable_cache(fetchEducation, ["education"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.education],
});
