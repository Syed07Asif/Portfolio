"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { projectFormSchema, type ProjectFeatureFormItem, type ProjectMediaFormItem } from "@/lib/validation";
import { CACHE_TAGS, STORAGE_BUCKETS } from "@/lib/constants";
import { deleteStorageFolder } from "@/lib/storage/cleanup";
import { slugify } from "@/lib/utils";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  withRecordId,
  type ActionResult,
} from "./shared";

const UNIQUE_VIOLATION = "23505";

/**
 * Unlike every other entity so far, a project renders in three places, not
 * one: the homepage's featured-projects section, the `/projects` index, and
 * its own `/projects/[slug]` ISR'd detail page — see docs/content-
 * management.md's cache-invalidation table, which flagged this exact three-
 * place update back when Projects was still "next up". `slugs` covers both
 * the current slug and (on an edit that changes it) the *old* one, so the
 * now-dead old detail path is busted too rather than left serving a stale
 * cached page indefinitely.
 */
function revalidateProject(slugs: Array<string | null | undefined> = []) {
  updateTag(CACHE_TAGS.projects);
  revalidatePath("/");
  revalidatePath("/projects");
  // The sitemap route is ISR-cached with its own `revalidate = 3600`, so
  // `updateTag` alone does not refresh it: that invalidates the *data* the
  // route reads, while the already-rendered XML keeps being served for up to
  // an hour. app/sitemap.ts's own comment claimed a project would appear
  // "immediately when the admin panel revalidates the projects tag" — Phase
  // 25 checked against production and found a sitemap listing neither
  // project, with a `lastmod` from before either existed. The route itself
  // has to be busted too.
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs.filter((value): value is string => Boolean(value)))) {
    revalidatePath(`/projects/${slug}`);
  }
}

/**
 * A project's `slug` column is `NOT NULL UNIQUE`, but per CLAUDE.md's Phase
 * 20 brief, saving a draft must never be blocked by validation — so the
 * schema (lib/validation/project.ts) accepts a blank slug, and this
 * derives a real one at the last moment: from the name if there is one,
 * otherwise a short random fallback. Never called when the admin actually
 * typed a slug (SlugField auto-fills from the name as the admin types, so
 * this path is really just "the admin saved before either field had
 * anything in it yet").
 */
function resolveSlug(slug: string, name: string): string {
  if (slug) return slug;
  const fromName = slugify(name);
  if (fromName) return fromName;
  return `project-${crypto.randomUUID().slice(0, 8)}`;
}

type ProjectChildren = {
  technologies: string[];
  features: ProjectFeatureFormItem[];
  media: ProjectMediaFormItem[];
};

/**
 * Full replace: every save clears and re-inserts the project's three
 * child-table arrays from whatever the form currently holds, rather than
 * diffing against what's already in the database. Simple and correct here
 * specifically because Storage cleanup for a *removed* media item already
 * happens independently and immediately, client-side, the instant the
 * admin removes it in ProjectMediaManager (the same "best-effort immediate
 * delete" pattern ImageUploader/MultiImageUploader already use) — this
 * function only ever has to reconcile *rows*, never orphan *files*.
 * Throws on failure rather than returning its own ActionResult — every
 * caller runs inside `createAdminAction`, whose try/catch already turns an
 * unexpected error into a safe generic message.
 */
async function writeProjectChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  children: ProjectChildren,
) {
  const [deleteTech, deleteFeatures, deleteMedia] = await Promise.all([
    supabase.from("project_technologies").delete().eq("project_id", projectId),
    supabase.from("project_features").delete().eq("project_id", projectId),
    supabase.from("project_media").delete().eq("project_id", projectId),
  ]);
  const deleteError = deleteTech.error ?? deleteFeatures.error ?? deleteMedia.error;
  if (deleteError) throw new Error(deleteError.message);

  const technologyRows = children.technologies
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({ project_id: projectId, name, display_order: index }));

  const featureRows = children.features
    .filter((feature) => feature.title.trim())
    .map((feature, index) => ({
      project_id: projectId,
      title: feature.title.trim(),
      description: feature.description?.trim() || null,
      display_order: index,
    }));

  const mediaRows = children.media.map((item, index) => ({
    project_id: projectId,
    file_url: item.file_url,
    storage_path: item.storage_path || null,
    media_type: item.media_type,
    title: item.title || null,
    alt_text: item.alt_text || null,
    caption: item.caption || null,
    display_order: index,
  }));

  const [insertTech, insertFeatures, insertMedia] = await Promise.all([
    technologyRows.length ? supabase.from("project_technologies").insert(technologyRows) : Promise.resolve({ error: null }),
    featureRows.length ? supabase.from("project_features").insert(featureRows) : Promise.resolve({ error: null }),
    mediaRows.length ? supabase.from("project_media").insert(mediaRows) : Promise.resolve({ error: null }),
  ]);
  const insertError = insertTech.error ?? insertFeatures.error ?? insertMedia.error;
  if (insertError) throw new Error(insertError.message);
}

export const createProject = createAdminAction(
  async (_admin, recordId: unknown, input: unknown): Promise<ActionResult<{ id: string; slug: string }>> => {
    const parsed = parseInput(projectFormSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const { technologies, features, media, ...projectFields } = parsed.data;
    const slug = resolveSlug(projectFields.slug, projectFields.name);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...withRecordId(recordId), ...projectFields, slug })
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === UNIQUE_VIOLATION) {
        return actionError("That slug is already in use.", { slug: ["That slug is already in use."] });
      }
      console.error("[lib/actions/projects] createProject:", error?.message);
      return actionError("Could not create this project.");
    }

    await writeProjectChildren(supabase, data.id, { technologies, features, media });

    revalidateProject([slug]);
    return actionSuccess({ id: data.id, slug });
  },
);

export const updateProject = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string; slug: string }>> => {
    const parsed = parseInput(projectFormSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const { technologies, features, media, ...projectFields } = parsed.data;
    const slug = resolveSlug(projectFields.slug, projectFields.name);

    const supabase = await createClient();
    const { data: existing } = await supabase.from("projects").select("slug").eq("id", id).maybeSingle();

    const { error } = await supabase
      .from("projects")
      .update({ ...projectFields, slug })
      .eq("id", id);

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return actionError("That slug is already in use.", { slug: ["That slug is already in use."] });
      }
      console.error("[lib/actions/projects] updateProject:", error.message);
      return actionError("Could not save changes.");
    }

    await writeProjectChildren(supabase, id, { technologies, features, media });

    revalidateProject([existing?.slug, slug]);
    return actionSuccess({ id, slug });
  },
);

export const deleteProject = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("projects").select("slug").eq("id", id).maybeSingle();

  // Removes logo/cover/gallery files in one sweep — project_technologies/
  // features/media rows themselves cascade-delete in Postgres (`on delete
  // cascade`, see supabase/migrations), so only the storage side needs
  // explicit cleanup here.
  await deleteStorageFolder(STORAGE_BUCKETS.projects.id, id);

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/projects] deleteProject:", error.message);
    return actionError("Could not delete this project.");
  }

  revalidateProject([existing?.slug]);
  return actionSuccess(null);
});

/**
 * Also enforces the publish-time requirement set (name/slug/short
 * description) for the AdminTable's inline Published switch — the one
 * publish path that doesn't go through `projectFormSchema`'s own
 * `superRefine`, since it flips the flag directly without resubmitting the
 * whole form.
 */
export const toggleProjectPublished = createAdminAction(
  async (_admin, id: string, published: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();

    if (published) {
      const { data: project } = await supabase
        .from("projects")
        .select("name, slug, short_description")
        .eq("id", id)
        .maybeSingle();

      const missing: string[] = [];
      if (!project?.name?.trim()) missing.push("a name");
      if (!project?.slug?.trim()) missing.push("a slug");
      if (!project?.short_description?.trim()) missing.push("a short description");
      if (missing.length > 0) {
        return actionError(`Add ${missing.join(", ")} before publishing.`);
      }
    }

    const { data: updated, error } = await supabase
      .from("projects")
      .update({ published })
      .eq("id", id)
      .select("slug")
      .maybeSingle();

    if (error) {
      console.error("[lib/actions/projects] toggleProjectPublished:", error.message);
      return actionError("Could not update publish status.");
    }

    revalidateProject([updated?.slug]);
    return actionSuccess(null);
  },
);

export const toggleProjectFeatured = createAdminAction(
  async (_admin, id: string, featured: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from("projects")
      .update({ featured })
      .eq("id", id)
      .select("slug")
      .maybeSingle();

    if (error) {
      console.error("[lib/actions/projects] toggleProjectFeatured:", error.message);
      return actionError("Could not update featured status.");
    }

    revalidateProject([updated?.slug]);
    return actionSuccess(null);
  },
);

export const reorderProject = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("projects").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/projects] reorderProject:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  revalidateProject();
  return actionSuccess(null);
});

/**
 * SlugField's live duplicate-check, scoped to "any *other* project already
 * using this slug" (an edit obviously collides with its own current row).
 * Returns a plain boolean, not an `ActionResult` — SlugField's
 * `checkAvailability` prop contract predates this being its first real
 * caller (see docs/content-management.md's "Known gaps") — so this checks
 * admin auth itself rather than going through `createAdminAction`, whose
 * wrapper assumes the `ActionResult` return shape.
 */
export async function checkProjectSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return false;
  if (!slug) return true;

  const supabase = await createClient();
  let query = supabase.from("projects").select("id").ilike("slug", slug).limit(1);
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) {
    console.error("[lib/actions/projects] checkProjectSlugAvailability:", error.message);
    return true;
  }
  return !data || data.length === 0;
}
