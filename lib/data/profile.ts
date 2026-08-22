import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Profile } from "@/types/content";
import { handleDataError } from "./shared";

const PROFILE_COLUMNS =
  "id, full_name, headline, short_bio, long_bio, avatar_url, location, availability_status, current_role, tagline";

/** Raw query, unwrapped — exported so tests can call it outside a Next.js server runtime (unstable_cache requires one). Components use getProfile() below. */
export async function fetchProfile(): Promise<Profile | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from("profile").select(PROFILE_COLUMNS).maybeSingle();

  if (error) {
    handleDataError("getProfile", error);
    return null;
  }
  return data;
}

export const getProfile = unstable_cache(fetchProfile, ["profile"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.profile],
});

/**
 * Admin-only read for the single-record editor — the cookie-aware
 * `createClient()` (not `unstable_cache`, same reasoning as
 * education.ts's fetchEducationForAdmin: this should be live on every
 * load, not stale for up to an hour for a single viewer). `profile` has
 * no `published` column at all (see supabase/migrations — it's a
 * singleton row, always "live" the instant it exists), so unlike every
 * other admin fetch there's no draft/published distinction to widen the
 * query for; this exists purely so the admin form isn't reading through
 * the public 1hr cache while editing.
 */
export async function fetchProfileForAdmin(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profile").select(PROFILE_COLUMNS).maybeSingle();

  if (error) {
    handleDataError("fetchProfileForAdmin", error);
    return null;
  }
  return data;
}
