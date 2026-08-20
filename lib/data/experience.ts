import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Experience } from "@/types/content";
import { handleDataError } from "./shared";

const ADMIN_EXPERIENCE_COLUMNS =
  "id, company, role, company_logo_url, location, employment_type, start_date, end_date, is_current, description, responsibilities, technologies, link_url, display_order, published";

/** The admin list/form shape — see education.ts's AdminEducation for why `published` is added back on top of the public `Experience` type. */
export type AdminExperience = Experience & { published: boolean };

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
    handleDataError("getExperience", error);
    return [];
  }
  return data ?? [];
}

export const getExperience = unstable_cache(fetchExperience, ["experience"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.experience],
});

/** Admin-only read — every row (draft and published), ordered for editing rather than display. See education.ts's fetchEducationForAdmin for the full reasoning (cookie-aware client, not unstable_cache). */
export async function fetchExperienceForAdmin(): Promise<AdminExperience[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experience")
    .select(ADMIN_EXPERIENCE_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    handleDataError("fetchExperienceForAdmin", error);
    return [];
  }
  return data ?? [];
}

export async function fetchExperienceByIdForAdmin(id: string): Promise<AdminExperience | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("experience").select(ADMIN_EXPERIENCE_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    handleDataError(`fetchExperienceByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}
