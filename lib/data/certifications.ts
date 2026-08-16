import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Certification } from "@/types/content";
import { logDataError } from "./shared";

/** Raw query, unwrapped — see profile.ts's fetchProfile for why. */
export async function fetchCertifications(): Promise<Certification[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("certifications")
    .select(
      "id, name, issuing_organization, organization_logo_url, issue_date, expiration_date, credential_id, credential_url, certificate_file_url, description, display_order",
    )
    .eq("published", true)
    .order("display_order", { ascending: true })
    .order("issue_date", { ascending: false });

  if (error) {
    logDataError("getCertifications", error);
    return [];
  }
  return data ?? [];
}

export const getCertifications = unstable_cache(fetchCertifications, ["certifications"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.certifications],
});
