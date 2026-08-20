"use server";

import { updateTag, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { contactLinkSchema } from "@/lib/validation";
import { CACHE_TAGS } from "@/lib/constants";
import {
  actionError,
  actionSuccess,
  createAdminAction,
  parseInput,
  reorderInputSchema,
  type ActionResult,
} from "./shared";

/** Contact links render on the homepage's Contact section and in the Footer — see docs/content-management.md's cache-invalidation table. */
function revalidateContactLinks() {
  updateTag(CACHE_TAGS.contactLinks);
  revalidatePath("/");
}

export const createContactLink = createAdminAction(
  async (_admin, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(contactLinkSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { data, error } = await supabase.from("contact_links").insert(parsed.data).select("id").single();

    if (error || !data) {
      console.error("[lib/actions/contactLinks] createContactLink:", error?.message);
      return actionError("Could not create this contact link.");
    }

    revalidateContactLinks();
    return actionSuccess({ id: data.id });
  },
);

export const updateContactLink = createAdminAction(
  async (_admin, id: string, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = parseInput(contactLinkSchema, input);
    if (!parsed.success) return actionError("Please fix the errors below.", parsed.fieldErrors);

    const supabase = await createClient();
    const { error } = await supabase.from("contact_links").update(parsed.data).eq("id", id);

    if (error) {
      console.error("[lib/actions/contactLinks] updateContactLink:", error.message);
      return actionError("Could not save changes.");
    }

    revalidateContactLinks();
    return actionSuccess({ id });
  },
);

export const deleteContactLink = createAdminAction(async (_admin, id: string): Promise<ActionResult<null>> => {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_links").delete().eq("id", id);

  if (error) {
    console.error("[lib/actions/contactLinks] deleteContactLink:", error.message);
    return actionError("Could not delete this contact link.");
  }

  revalidateContactLinks();
  return actionSuccess(null);
});

export const toggleContactLinkPublished = createAdminAction(
  async (_admin, id: string, published: boolean): Promise<ActionResult<null>> => {
    const supabase = await createClient();
    const { error } = await supabase.from("contact_links").update({ published }).eq("id", id);

    if (error) {
      console.error("[lib/actions/contactLinks] toggleContactLinkPublished:", error.message);
      return actionError("Could not update publish status.");
    }

    revalidateContactLinks();
    return actionSuccess(null);
  },
);

export const reorderContactLinks = createAdminAction(async (_admin, input: unknown): Promise<ActionResult<null>> => {
  const parsed = parseInput(reorderInputSchema, input);
  if (!parsed.success) return actionError("Invalid reorder request.");

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) => supabase.from("contact_links").update({ display_order }).eq("id", id)),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[lib/actions/contactLinks] reorderContactLinks:", failed.error.message);
    return actionError("Could not save the new order.");
  }

  revalidateContactLinks();
  return actionSuccess(null);
});
