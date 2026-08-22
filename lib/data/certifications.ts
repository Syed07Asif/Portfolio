import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { Certification } from "@/types/content";
import { handleDataError } from "./shared";

const ADMIN_CERTIFICATION_COLUMNS =
  "id, name, issuing_organization, organization_logo_url, issue_date, expiration_date, credential_id, credential_url, certificate_file_url, description, display_order, published";

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
    handleDataError("getCertifications", error);
    return [];
  }
  return data ?? [];
}

export const getCertifications = unstable_cache(fetchCertifications, ["certifications"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.certifications],
});

/** The admin list/form shape — Certification plus published, which every public consumer already knows is true by construction. */
export type AdminCertification = Certification & { published: boolean };

/** Admin-only read — every row (draft and published). See fetchEducationForAdmin's doc comment for why this isn't wrapped in unstable_cache. */
export async function fetchCertificationsForAdmin(): Promise<AdminCertification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certifications")
    .select(ADMIN_CERTIFICATION_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    handleDataError("fetchCertificationsForAdmin", error);
    return [];
  }
  return data ?? [];
}

/** Single-row admin read for the edit page — draft or published. */
export async function fetchCertificationByIdForAdmin(id: string): Promise<AdminCertification | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certifications")
    .select(ADMIN_CERTIFICATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    handleDataError(`fetchCertificationByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}
