import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Education } from "@/types/content";
import { handleDataError } from "./shared";

const ADMIN_EDUCATION_COLUMNS =
  "id, institution, degree, field_of_study, institution_logo_url, start_date, end_date, grade, description, link_url, display_order, published";

/** The admin list/form shape — `Education` (types/content.ts) deliberately omits `published`, since every public consumer already knows it's true by construction (the public query filters on it). The admin table/form needs to see and toggle it directly. */
export type AdminEducation = Education & { published: boolean };

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
    handleDataError("getEducation", error);
    return [];
  }
  return data ?? [];
}

export const getEducation = unstable_cache(fetchEducation, ["education"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.education],
});

/**
 * Admin-only read — every row (draft and published), ordered the way an
 * admin edits rather than the way a visitor reads (`display_order` only;
 * public's secondary `start_date desc` tiebreaker doesn't apply here,
 * since reordering *is* the admin's own explicit action on this list).
 * Uses the cookie-aware `createClient()` (the signed-in admin's session,
 * which RLS's `is_admin()` policies grant full visibility to) rather than
 * `createStaticClient()` — not cached via `unstable_cache` for the same
 * reasons as lib/data/adminDashboard.ts: `cookies()` is forbidden inside
 * it anyway, and this should be live on every load, not stale for up to
 * an hour for a single viewer.
 */
export async function fetchEducationForAdmin(): Promise<AdminEducation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("education")
    .select(ADMIN_EDUCATION_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    handleDataError("fetchEducationForAdmin", error);
    return [];
  }
  return data ?? [];
}

/** Single-row admin read for the edit page — draft or published, unlike anything in lib/data's public functions. */
export async function fetchEducationByIdForAdmin(id: string): Promise<AdminEducation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("education").select(ADMIN_EDUCATION_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    handleDataError(`fetchEducationByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}
