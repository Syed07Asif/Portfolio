import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { ContactLink } from "@/types/content";
import { logDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchContactLinks(): Promise<ContactLink[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("contact_links")
    .select("id, label, type, value, url, icon, display_order")
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    logDataError("getContactLinks", error);
    return [];
  }
  return data ?? [];
}

export const getContactLinks = unstable_cache(fetchContactLinks, ["contact-links"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.contactLinks],
});
