import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { fetchProjects, fetchProjectSlugs, fetchProjectBySlug } from "@/lib/data/projects";
import { fetchCertifications } from "@/lib/data/certifications";
import { fetchAchievements } from "@/lib/data/achievements";
import { fetchContactLinks } from "@/lib/data/contactLinks";
import { fetchExperience } from "@/lib/data/experience";
import { fetchEducation } from "@/lib/data/education";

/**
 * Runs against the real local Supabase stack, deliberately — the thing under
 * test is a PostgREST query's `.eq("published", true)` filter plus the RLS
 * policy behind it, neither of which a mocked client would exercise at all.
 * A mock here would pass whether or not the filter existed.
 *
 * The `fetchX` (raw) functions are used rather than the cached `getX`
 * wrappers for the reason tests/lib/data/smoke.ts already documents: `getX`
 * is `unstable_cache(fetchX)` and needs a full Next.js server runtime. The
 * query logic — the part being asserted — is identical.
 *
 * Creates one unpublished row of its own and removes it again, so the
 * assertion is about a draft that definitely exists rather than about
 * whatever the seed happens to contain.
 */
/**
 * Writes go through a *signed-in admin* session, not the service-role key.
 * That is deliberate on two counts: it exercises the same RLS path the admin
 * panel really uses, and the service-role key does not currently work against
 * this database anyway — the JWT carries `role: service_role` correctly, but
 * no migration ever issued `GRANT ... TO service_role`, so PostgREST answers
 * `42501 permission denied for table projects`. Nothing in the app imports
 * lib/supabase/admin.ts, so that gap is latent rather than live; Phase 24
 * found it by trying to use it here.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, anonKey, { auth: { persistSession: false } });

const DRAFT_SLUG = "zz-phase24-draft-fixture";
let draftId: string | null = null;

beforeAll(async () => {
  const { error: signInError } = await admin.auth.signInWithPassword({
    email: "test-admin@example.com",
    password: "Test-Admin-Pass-123!",
  });
  if (signInError) throw new Error(`admin sign-in failed: ${signInError.message}`);

  await admin.from("projects").delete().eq("slug", DRAFT_SLUG);
  const { data, error } = await admin
    .from("projects")
    .insert({
      slug: DRAFT_SLUG,
      name: "Phase 24 draft fixture",
      short_description: "Must never appear on the public site.",
      published: false,
      display_order: 999,
    })
    .select("id")
    .single();
  if (error) throw new Error(`fixture insert failed: ${error.message}`);
  draftId = data.id;
});

afterAll(async () => {
  if (draftId) await admin.from("projects").delete().eq("id", draftId);
});

describe("the data access layer returns only published content", () => {
  it("fetchProjects excludes an unpublished project", async () => {
    const slugs = (await fetchProjects()).map((p) => p.slug);
    expect(slugs).not.toContain(DRAFT_SLUG);
  });

  it("fetchProjectSlugs excludes an unpublished project", async () => {
    expect(await fetchProjectSlugs()).not.toContain(DRAFT_SLUG);
  });

  it("fetchProjectBySlug returns null for an unpublished project", async () => {
    expect(await fetchProjectBySlug(DRAFT_SLUG)).toBeNull();
  });

  /*
   * The mirror assertion — that `fetchProjectBySlugForPreview` *does* return
   * this row — deliberately is not here. That function builds its client with
   * `createClient()`, which reads `cookies()` and therefore requires a real
   * Next.js request context; called from a plain test process it throws
   * `throwForMissingRequestStore`. Draft-mode preview is covered end to end
   * instead, in tests/e2e/owner-journey.spec.ts, where a real request and a
   * real draft-mode cookie exist.
   */

  it("every project returned by fetchProjects is published in the database", async () => {
    const returned = await fetchProjects();
    if (returned.length === 0) return;
    const { data } = await admin
      .from("projects")
      .select("slug, published")
      .in("slug", returned.map((p) => p.slug));
    expect((data ?? []).every((r) => r.published)).toBe(true);
  });

  it.each([
    ["certifications", fetchCertifications],
    ["achievements", fetchAchievements],
    ["contact links", fetchContactLinks],
    ["experience", fetchExperience],
    ["education", fetchEducation],
  ])("%s only returns rows the database marks published", async (table, fetcher) => {
    const rows = (await fetcher()) as Array<{ id: string }>;
    if (rows.length === 0) return;
    const tableName = { certifications: "certifications", achievements: "achievements",
      "contact links": "contact_links", experience: "experience", education: "education" }[table]!;
    const { data } = await admin.from(tableName).select("id, published").in("id", rows.map((r) => r.id));
    expect((data ?? []).every((r) => r.published)).toBe(true);
  });
});
