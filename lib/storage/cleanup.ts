import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Removes every object under `{bucket}/{recordId}/` — the whole folder a
 * record owns, per the `{bucket}/{recordId}/{uuid}.{ext}` convention every
 * uploader writes to (see lib/storage/upload.ts). Called from every
 * entity's `deleteX` action, before the row itself is deleted, so a
 * deleted record never leaves orphaned files behind.
 *
 * Uses the cookie-aware `createClient()` (the calling admin's own
 * session) rather than the service-role client — Storage's own policies
 * already grant an authenticated admin `delete` on every bucket (see
 * docs/architecture.md's Storage policy model), so no bypass is needed.
 *
 * Deliberately non-throwing: a failed storage cleanup shouldn't block the
 * admin from deleting the row itself (a stuck, permanently-undeletable
 * record would be worse than one orphaned file); the failure is logged
 * server-side instead.
 */
export async function deleteStorageFolder(bucket: string, recordId: string): Promise<void> {
  const supabase = await createClient();

  const { data: entries, error: listError } = await supabase.storage.from(bucket).list(recordId);
  if (listError) {
    console.error(`[lib/storage] deleteStorageFolder: could not list ${bucket}/${recordId}/:`, listError.message);
    return;
  }
  if (!entries || entries.length === 0) return;

  const paths = entries.map((entry) => `${recordId}/${entry.name}`);
  const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
  if (removeError) {
    console.error(`[lib/storage] deleteStorageFolder: could not remove ${bucket}/${recordId}/:`, removeError.message);
  }
}
