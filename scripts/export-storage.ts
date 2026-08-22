import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { backupStamp, loadBackupEnv } from "./lib/backup-env";

/**
 * Downloads every object in every Storage bucket to disk — the "the files
 * the content points at" half of the backup story, the counterpart to
 * `export-content.ts`'s rows.
 *
 * ## Why a separate script, and why it matters more than it looks
 *
 * A database backup restores `project_media.file_url`. It does not restore
 * the PNG that URL points at. Supabase's own backups cover Postgres;
 * Storage objects live in object storage and are *not* included in a
 * database restore, so a project restored from a database backup alone
 * comes back with every image 404ing. This is the script that prevents
 * that, and it is the one most worth actually running on a schedule,
 * because the media is the part that cannot be retyped from memory.
 *
 * ## Buckets are discovered, not hardcoded
 *
 * `listBuckets()` is the source of truth rather than a list in this file,
 * so a bucket added by a future migration is backed up the day it exists
 * without anyone remembering to edit a script. That is the same principle
 * CLAUDE.md applies to content: the database says what exists, the code
 * says what to do with it.
 *
 * ## Layout on disk
 *
 *   backups/storage/<stamp>/<bucket>/<the object's own path>
 *   backups/storage/<stamp>/manifest.json
 *
 * The object's Storage path is preserved verbatim, so a restore is a
 * straight upload of each file back to the same bucket and path, and the
 * `file_url`s in a content export keep resolving. See docs/deployment.md's
 * "Restoring Storage media".
 */

/** Storage's `list()` caps out well below this; paging is not optional. */
const PAGE_SIZE = 100;

interface StorageEntry {
  bucket: string;
  path: string;
  size: number | null;
  mimeType: string | null;
  updatedAt: string | null;
}

/**
 * Storage's `list()` is directory-shaped, not recursive: it returns the
 * entries directly under one prefix, and a "folder" comes back as an entry
 * with a null `id`. Walking it is therefore a real traversal, not one
 * call — and every uploader in this app writes to `<record-id>/<uuid>.<ext>`,
 * so *everything* is one level down and a non-recursive listing would find
 * exactly zero files. That is the trap this function exists to avoid.
 */
async function listRecursive(
  supabase: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<StorageEntry[]> {
  const found: StorageEntry[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });

    if (error) {
      throw new Error(`Listing ${bucket}/${prefix} failed: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A null id means "this is a folder", not "this is a broken file".
      if (entry.id === null) {
        found.push(...(await listRecursive(supabase, bucket, path)));
      } else {
        found.push({
          bucket,
          path,
          size: (entry.metadata?.size as number | undefined) ?? null,
          mimeType: (entry.metadata?.mimetype as string | undefined) ?? null,
          updatedAt: entry.updated_at ?? null,
        });
      }
    }

    if (data.length < PAGE_SIZE) break;
  }

  return found;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const env = loadBackupEnv(argv);

  const supabase = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = backupStamp();
  const outDir = resolve(process.cwd(), "backups", "storage", stamp);

  console.log(`Storage export`);
  console.log(`  source : ${env.supabaseHost}${env.envFile ? ` (via ${env.envFile})` : ""}`);
  console.log(`  target : ${dryRun ? "(dry run — nothing will be downloaded)" : outDir}`);
  console.log("");

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    throw new Error(`Listing buckets failed: ${bucketError.message}`);
  }
  if (!buckets || buckets.length === 0) {
    throw new Error(
      "No Storage buckets found. The buckets are created by " +
        "supabase/migrations/20260816103908_rls_and_storage.sql and " +
        "20260818091500_settings_storage_bucket.sql — if this is a real project, those " +
        "migrations have not been applied.",
    );
  }

  if (!dryRun) mkdirSync(outDir, { recursive: true });

  const manifestEntries: Array<StorageEntry & { savedAs: string }> = [];
  let downloaded = 0;
  let totalBytes = 0;
  const failures: Array<{ bucket: string; path: string; reason: string }> = [];

  for (const bucket of buckets) {
    const entries = await listRecursive(supabase, bucket.name);
    console.log(`  ${bucket.name.padEnd(16)} ${String(entries.length).padStart(4)} objects`);

    for (const entry of entries) {
      const savedAs = join(bucket.name, ...entry.path.split("/"));

      if (dryRun) {
        manifestEntries.push({ ...entry, savedAs });
        totalBytes += entry.size ?? 0;
        continue;
      }

      const { data, error } = await supabase.storage.from(bucket.name).download(entry.path);
      if (error || !data) {
        // One unreadable object should not abandon the other 200. Collect
        // and report at the end, and fail the run's exit code so a
        // scheduled backup does not look clean.
        failures.push({
          bucket: bucket.name,
          path: entry.path,
          reason: error?.message ?? "no body returned",
        });
        continue;
      }

      const destination = join(outDir, savedAs);
      mkdirSync(dirname(destination), { recursive: true });
      const buffer = Buffer.from(await data.arrayBuffer());
      writeFileSync(destination, buffer);

      manifestEntries.push({ ...entry, savedAs });
      downloaded += 1;
      totalBytes += buffer.byteLength;
    }
  }

  const manifest = {
    kind: "portfolio-storage-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    source: env.supabaseHost,
    buckets: buckets.map((b) => b.name),
    objectCount: manifestEntries.length,
    totalBytes,
    objects: manifestEntries,
    failures,
  };

  if (!dryRun) {
    writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  console.log("");
  console.log(
    `  ${dryRun ? manifestEntries.length : downloaded} objects, ${formatBytes(totalBytes)} across ${buckets.length} buckets`,
  );
  if (dryRun) {
    console.log(`  dry run — nothing downloaded`);
  } else {
    console.log(`  written to backups/storage/${stamp}/`);
  }

  if (failures.length > 0) {
    console.error("");
    console.error(`  ${failures.length} object(s) could NOT be downloaded:`);
    for (const failure of failures) {
      console.error(`    ${failure.bucket}/${failure.path} — ${failure.reason}`);
    }
    console.error("  Exiting non-zero: this backup is incomplete.");
    process.exitCode = 1;
  }

  /**
   * Zero objects is legitimate on a brand-new project, so unlike the
   * content export this is a warning rather than a failure — but it is
   * worth saying out loud, because "the backup ran and found nothing" and
   * "the backup ran against the wrong project" look identical otherwise.
   */
  if (manifestEntries.length === 0) {
    console.log("");
    console.log("  Note: every bucket is empty. That is expected on a project where no");
    console.log("  media has been uploaded yet, and a misconfiguration otherwise.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
