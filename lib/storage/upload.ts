"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Client-safe upload helpers — called directly from ImageUploader/
 * MultiImageUploader (browser), not from a Server Action. Uploading
 * straight from the browser to Storage (rather than routing file bytes
 * through a Server Action) avoids serializing a File through the Server
 * Action RPC boundary entirely; the signed-in admin's own session already
 * satisfies Storage's `insert`/`update` policies
 * (`authenticated` + `is_admin()` — see docs/architecture.md's Storage
 * policy model), so no service-role key is needed here.
 */

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Every uploaded file lives at `{bucket}/{recordId}/{uuid}.{ext}` — one
 * folder per record, no `storage_path` bookkeeping needed on the row
 * itself (see lib/storage/cleanup.ts). `recordId` is a real row id for an
 * existing record, or a client-generated placeholder (`crypto.randomUUID()`)
 * for a not-yet-created one — either way it's just the folder name.
 */
export function buildStoragePath(recordId: string, file: File): string {
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".") + 1) : "bin";
  return `${recordId}/${crypto.randomUUID()}.${ext}`;
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<UploadResult> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message || "Upload failed.");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort — used by "remove" in the uploader UI, where `deleteStorageFolder` (the record-deletion path) is the real backstop regardless of whether this succeeds. */
export async function removeFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.error("[lib/storage] removeFiles failed:", error.message);
  }
}

/**
 * Recovers a bucket-relative storage path from the public URL stored on a
 * record — needed because the uploader only ever has the row's saved
 * `*_url` value to work from when the admin clicks "remove", not the
 * original upload's path. Supabase's public object URL always has the
 * shape `.../storage/v1/object/public/{bucket}/{path}`.
 */
export function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}
