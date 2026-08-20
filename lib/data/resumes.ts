import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Resume } from "@/types/content";
import { handleDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchActiveResume(): Promise<Resume | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, file_url, version_label, uploaded_at")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    handleDataError("getActiveResume", error);
    return null;
  }
  return data;
}

export const getActiveResume = unstable_cache(fetchActiveResume, ["active-resume"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.resume],
});

/** The admin list shape — every version, active or not, plus the internal storage_path needed for cleanup on delete. */
export type AdminResume = Resume & { storage_path: string | null; is_active: boolean };

/** Admin-only read — every uploaded version, newest first. See fetchEducationForAdmin's doc comment for why this isn't wrapped in unstable_cache. */
export async function fetchResumesForAdmin(): Promise<AdminResume[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, file_url, storage_path, version_label, is_active, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (error) {
    handleDataError("fetchResumesForAdmin", error);
    return [];
  }
  return data ?? [];
}
