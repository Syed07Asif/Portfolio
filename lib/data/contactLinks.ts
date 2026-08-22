import { unstable_cache } from "next/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/constants";
import type { ContactLink } from "@/types/content";
import { handleDataError } from "./shared";

const ADMIN_CONTACT_LINK_COLUMNS = "id, label, type, value, url, icon, display_order, published";

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
    handleDataError("getContactLinks", error);
    return [];
  }
  return data ?? [];
}

export const getContactLinks = unstable_cache(fetchContactLinks, ["contact-links"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.contactLinks],
});

/** The admin list/form shape — ContactLink plus published, which every public consumer already knows is true by construction. */
export type AdminContactLink = ContactLink & { published: boolean };

/** Admin-only read — every row (draft and published). See fetchEducationForAdmin's doc comment for why this isn't wrapped in unstable_cache. */
export async function fetchContactLinksForAdmin(): Promise<AdminContactLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_links")
    .select(ADMIN_CONTACT_LINK_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    handleDataError("fetchContactLinksForAdmin", error);
    return [];
  }
  return data ?? [];
}

/** Single-row admin read for the edit page — draft or published. */
export async function fetchContactLinkByIdForAdmin(id: string): Promise<AdminContactLink | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_links")
    .select(ADMIN_CONTACT_LINK_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    handleDataError(`fetchContactLinkByIdForAdmin(${id})`, error);
    return null;
  }
  return data;
}
