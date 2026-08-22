"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { certificationSchema } from "@/lib/validation";
import { CACHE_TAGS, STORAGE_BUCKETS } from "@/lib/constants";
import { deleteStorageFolder } from "@/lib/storage/cleanup";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  type ActionResult,
} from "./shared";

/** Certifications render in exactly one place — the homepage's Certifications section. */
function revalidateCertifications() {
  updateTag(CACHE_TAGS.certifications);
  revalidatePath("/");
}

export const createCertification = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(certificationSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase.from("certifications").insert(parsed.data).select("id").single();

    if (error || !data) {
      console.error("[lib/actions/certifications] createCertification:", error?.message);
      return actionError("Could not create this certification.");
    }

    revalidateCertifications();
    return actionSuccess({ id: data.id });
  },
);

export const updateCertification = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(certificationSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { error } = await supabase.from("certifications").update(parsed.data).eq("id", id);

    if (error) {
      console.error("[lib/actions/certifications] updateCertification:", error.message);
      return actionError("Could not save changes.");
    }

    revalidateCertifications();
    return actionSuccess({ id });
  },
);

export const deleteCertification = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  await deleteStorageFolder(STORAGE_BUCKETS.certifications.id, id);

  const supabase = await createClient();
  const { error } = await supabase.from("certifications").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/certifications] deleteCertification:", error.message);
    return actionError("Could not delete this certification.");
  }

  revalidateCertifications();
  return actionSuccess(null);
});

export const toggleCertificationPublished = createAdminAction(
  async (_admin, id: string, published: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();
    const { error } = await supabase.from("certifications").update({ published }).eq("id", id);

    if (error) {
      console.error("[lib/actions/certifications] toggleCertificationPublished:", error.message);
      return actionError("Could not update publish status.");
    }

    revalidateCertifications();
    return actionSuccess(null);
  },
);

export const reorderCertifications = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("certifications").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/certifications] reorderCertifications:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  revalidateCertifications();
  return actionSuccess(null);
});
