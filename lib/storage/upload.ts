"use client";

import { createClient } from "@/lib/supabase/client";
import { UploadError } from "./errors";

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

export interface UploadOptions {
  /** Called with 0-100 as the bytes go out. Fires at least once with 100 before the promise resolves. */
  onProgress?: (percent: number) => void;
}

/**
 * Uploads straight to Storage's REST endpoint over `XMLHttpRequest` rather
 * than through `supabase.storage.from().upload()`.
 *
 * The reason is `xhr.upload.onprogress`, which is the only way to get real
 * byte-level progress in a browser: the installed `@supabase/storage-js`
 * uses `fetch`, which exposes no upload-progress event at all, and that
 * limitation is why the uploaders previously showed an indeterminate
 * spinner. Everything else about the request is what the client library
 * itself sends — same `POST /storage/v1/object/{bucket}/{path}`, same
 * `x-upsert`, same bearer token — so RLS applies identically; this is a
 * different transport for the same call, not a different privilege path.
 *
 * Failures come back as `UploadError` carrying the HTTP status, which
 * `describeUploadError` needs to say something specific and actionable.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const supabase = createClient();

  // The admin's own session token — the same credential the client library
  // would attach. Without it the request would be anonymous and RLS would
  // reject it, so this is worth failing early and clearly on.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new UploadError("Your session has ended. Sign in again to upload files.", 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "3600");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress || !event.lengthComputable) return;
      options.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100);
        resolve();
        return;
      }
      // Storage errors come back as {statusCode, error, message}; fall back
      // to the raw body when it isn't JSON (a proxy/gateway error page).
      let message = xhr.responseText || `Upload failed with status ${xhr.status}.`;
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        // Not JSON — keep the raw text.
      }
      reject(new UploadError(message, xhr.status));
    };

    // Network-level failure: no response ever arrived, so there is no
    // status to report. `describeUploadError` keys "couldn't reach storage"
    // off exactly this shape (status 0 + a network message).
    xhr.onerror = () => reject(new UploadError("Network error during upload.", 0));
    xhr.ontimeout = () => reject(new UploadError("The upload timed out.", 0));
    xhr.onabort = () => reject(new UploadError("The upload was cancelled.", 0));

    xhr.send(file);
  });

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
