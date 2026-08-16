import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Resume } from "@/types/content";
import { logDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchActiveResume(): Promise<Resume | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, file_url, version_label, uploaded_at")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    logDataError("getActiveResume", error);
    return null;
  }
  return data;
}

export const getActiveResume = unstable_cache(fetchActiveResume, ["active-resume"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.resume],
});
