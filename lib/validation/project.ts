import { z } from "zod";
import { Constants } from "@/types/database";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  displayOrderSchema,
  fileSchema,
  optionalDateSchema,
  optionalAssetUrlSchema,
  optionalUrlSchema,
  publishedSchema,
  requiredUrlSchema,
  slugSchema,
  textSchema,
} from "./shared";

export const projectStatusSchema = z.enum(Constants.public.Enums.project_status);
export const mediaTypeSchema = z.enum(Constants.public.Enums.media_type);

/**
 * `name`/`slug`/`short_description` are deliberately NOT required at the
 * field level — per CLAUDE.md's Phase 20 brief, a project must be
 * creatable and saveable in an incomplete state without validation
 * blocking the save; only *publishing* enforces the full requirement set.
 * That gate lives in the `.superRefine` below instead, scoped to
 * `published === true`, so the same schema serves both a bare-draft save
 * and a publish attempt correctly. `slug` still validates its *format*
 * when non-empty (a half-typed slug shouldn't silently save malformed) —
 * an empty slug is filled in server-side from the name (or a random
 * fallback) by lib/actions/projects.ts, since the database column is
 * `NOT NULL UNIQUE` and can't stay blank the way a draft's other fields
 * can.
 */
const projectBaseSchema = z.object({
  slug: z.union([slugSchema, z.literal("")]).default(""),
  name: textSchema(200),
  short_description: textSchema(300).optional().nullable(),
  description: textSchema(5000).optional().nullable(),
  problem_statement: textSchema(3000).optional().nullable(),
  solution: textSchema(3000).optional().nullable(),
  purpose: textSchema(1000).optional().nullable(),
  logo_url: optionalAssetUrlSchema,
  cover_image_url: optionalAssetUrlSchema,
  github_url: optionalUrlSchema,
  demo_url: optionalUrlSchema,
  video_url: optionalUrlSchema,
  status: projectStatusSchema.default("planned"),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  featured: z.boolean().default(false),
  display_order: displayOrderSchema,
  published: publishedSchema,
});

/**
 * Both refinements below are duplicated verbatim onto `projectSchema` and
 * `projectFormSchema` (rather than factored into one generic helper) —
 * `useAdminForm`'s own doc comment already established this codebase's
 * preference for a little duplication over fighting Zod/TS generic
 * variance across a `.refine()`/`.superRefine()` chain, and both call
 * sites are short enough that the duplication is cheap to keep in sync.
 */
function endDateNotBeforeStart(data: { start_date: string | null; end_date: string | null }) {
  return !data.start_date || !data.end_date || data.end_date >= data.start_date;
}

function checkPublishRequirements(
  data: { published: boolean; name: string; slug: string; short_description?: string | null },
  ctx: z.RefinementCtx,
) {
  if (!data.published) return;
  if (!data.name.trim()) {
    ctx.addIssue({ code: "custom", message: "A name is required to publish.", path: ["name"] });
  }
  if (!data.slug.trim()) {
    ctx.addIssue({ code: "custom", message: "A slug is required to publish.", path: ["slug"] });
  }
  if (!data.short_description?.trim()) {
    ctx.addIssue({ code: "custom", message: "A short description is required to publish.", path: ["short_description"] });
  }
}

export const projectSchema = projectBaseSchema
  .refine(endDateNotBeforeStart, { message: "End date can't be before the start date", path: ["end_date"] })
  .superRefine(checkPublishRequirements);
export type ProjectInput = z.infer<typeof projectSchema>;

/** One row of the form's `technologies` array — a name only; `display_order` is assigned from array position at submit time. */
export const projectTechnologyFormItemSchema = textSchema(100);

/** One row of the form's `features` array — both fields optional at the row level; a fully-empty row is dropped before submit rather than rejected (see ProjectForm). */
export const projectFeatureFormItemSchema = z.object({
  title: textSchema(200),
  description: textSchema(1000).optional().nullable(),
});
export type ProjectFeatureFormItem = z.infer<typeof projectFeatureFormItemSchema>;

/** One row of the form's `media` array — always produced by a completed upload (ProjectMediaManager), so `file_url` is always present by construction. */
export const projectMediaFormItemSchema = z.object({
  file_url: requiredUrlSchema,
  storage_path: textSchema(500).optional().nullable(),
  media_type: mediaTypeSchema,
  title: textSchema(200).optional().nullable(),
  alt_text: textSchema(300).optional().nullable(),
  caption: textSchema(500).optional().nullable(),
});
export type ProjectMediaFormItem = z.infer<typeof projectMediaFormItemSchema>;

/**
 * The full create/edit form's schema — the project's own columns plus its
 * three child-table arrays (technologies/features/media), all edited
 * together on one screen and written out by lib/actions/projects.ts's
 * `writeProjectChildren` as a full replace on every save. Never used
 * directly against `project_technologies`/`project_features`/
 * `project_media` themselves — those tables' own row shapes are
 * `projectTechnologySchema`/`projectFeatureSchema`/`projectMediaSchema`
 * below, which the action layer maps this form data into once a real
 * `project_id` exists.
 */
export const projectFormSchema = projectBaseSchema
  .extend({
    technologies: z.array(projectTechnologyFormItemSchema).default([]),
    features: z.array(projectFeatureFormItemSchema).default([]),
    media: z.array(projectMediaFormItemSchema).default([]),
  })
  .refine(endDateNotBeforeStart, { message: "End date can't be before the start date", path: ["end_date"] })
  .superRefine(checkPublishRequirements);
export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const projectTechnologySchema = z.object({
  project_id: z.uuid(),
  name: textSchema(100),
  icon: textSchema(100).optional().nullable(),
  display_order: displayOrderSchema,
});

export type ProjectTechnologyInput = z.infer<typeof projectTechnologySchema>;

export const projectFeatureSchema = z.object({
  project_id: z.uuid(),
  title: textSchema(200),
  description: textSchema(1000).optional().nullable(),
  display_order: displayOrderSchema,
});

export type ProjectFeatureInput = z.infer<typeof projectFeatureSchema>;

export const projectMediaSchema = z.object({
  project_id: z.uuid(),
  file_url: requiredUrlSchema,
  storage_path: textSchema(500).optional().nullable(),
  media_type: mediaTypeSchema,
  title: textSchema(200).optional().nullable(),
  alt_text: textSchema(300).optional().nullable(),
  caption: textSchema(500).optional().nullable(),
  display_order: displayOrderSchema,
});

export type ProjectMediaInput = z.infer<typeof projectMediaSchema>;

export const projectMediaFileSchema = fileSchema(STORAGE_BUCKETS.projects);
