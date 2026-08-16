import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Profile } from "@/types/content";
import { logDataError } from "./shared";

/** Raw query, unwrapped — exported so tests can call it outside a Next.js server runtime (unstable_cache requires one). Components use getProfile() below. */
export async function fetchProfile(): Promise<Profile | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("profile")
    .select(
      "id, full_name, headline, short_bio, long_bio, avatar_url, location, availability_status, current_role, tagline",
    )
    .maybeSingle();

  if (error) {
    logDataError("getProfile", error);
    return null;
  }
  return data;
}

export const getProfile = unstable_cache(fetchProfile, ["profile"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.profile],
});
