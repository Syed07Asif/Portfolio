import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadBackupEnv } from "./lib/backup-env";

/**
 * Finds — and optionally removes — Storage objects that no content row
 * references any more.
 *
 * ## Why this exists even though the leak is fixed
 *
 * Phase 25 fixed the *cause*: a file uploaded on a create form used to land
 * in a placeholder folder that the eventual row never owned, so deleting the
 * record could never reclaim it (see `resolveNewRecordId` in
 * lib/actions/shared.ts). New records no longer orphan anything.
 *
 * That does nothing for files already stranded by the old behaviour. Those
 * are unreachable by definition — no row points at them, so no delete will
 * ever touch them, and they will sit in the bucket paying for themselves
 * forever. This drains that pool.
 *
 * It is also the honest long-term answer to a second, narrower case that no
 * amount of care in the delete path removes: an upload that succeeds and is
 * then abandoned, because the admin replaced the image before saving or
 * closed the tab on a half-filled create form. The file is real, the row
 * never existed. Nothing but a sweep can know that.
 *
 * ## How "orphan" is decided
 *
 * Conservatively, and from the content side rather than the storage side:
 * every URL-ish string in every content row is collected, and an object is
 * an orphan only if its public URL appears in *none* of them. A column this
 * script doesn't know about cannot cause a false positive, because it reads
 * every column of every table rather than a list of known file columns —
 * the failure mode of an unknown column is that a genuine orphan is kept,
 * which is the direction you want to be wrong in.
 *
 * ## It does not delete anything unless you say so
 *
 * Default is a report. `--delete` is required to actually remove, and the
 * report is worth reading first: an unexpectedly large orphan count usually
 * means the script is pointed at the wrong project, not that you have a lot
 * of garbage.
 */

const TABLES = [
  "profile",
  "skill_categories",
  "skills",
  "experience",
  "education",
  "projects",
  "project_technologies",
  "project_features",
  "project_media",
  "certifications",
  "achievements",
  "blog_posts",
  "contact_links",
  "resumes",
  "site_settings",
] as const;

const PAGE_SIZE = 100;

interface Orphan {
  bucket: string;
  path: string;
  size: number;
}

/**
 * Every string value anywhere in the content tables, lowercased. Values are
 * collected wholesale rather than per known column so that a file column
 * added later is covered without editing this script — see the doc comment
 * above on which way this errs.
 */
async function collectReferencedStrings(supabase: SupabaseClient): Promise<string> {
  const chunks: string[] = [];

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      throw new Error(`Reading ${table} failed: ${error.message}. If this is 42501, the service_role grants migration has not been applied.`);
    }
    // Stringifying the rows wholesale catches URLs nested inside jsonb
    // columns (site_settings.primary_nav, for one) that a column-by-column
    // walk would miss.
    chunks.push(JSON.stringify(data ?? []).toLowerCase());
  }

  return chunks.join("\n");
}

/** Same directory-shaped recursion as scripts/export-storage.ts — folders come back with a null id. */
async function listRecursive(
  supabase: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<Array<{ path: string; size: number }>> {
  const found: Array<{ path: string; size: number }> = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`Listing ${bucket}/${prefix} failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        found.push(...(await listRecursive(supabase, bucket, path)));
      } else {
        found.push({ path, size: (entry.metadata?.size as number | undefined) ?? 0 });
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
  const shouldDelete = argv.includes("--delete");
  const env = loadBackupEnv(argv);

  const supabase = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Storage orphan sweep");
  console.log(`  source : ${env.supabaseHost}${env.envFile ? ` (via ${env.envFile})` : ""}`);
  console.log(`  mode   : ${shouldDelete ? "DELETE — orphans will be removed" : "report only (pass --delete to remove)"}`);
  console.log("");

  const referenced = await collectReferencedStrings(supabase);

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) throw new Error(`Listing buckets failed: ${bucketError.message}`);
  if (!buckets || buckets.length === 0) throw new Error("No Storage buckets found.");

  const orphans: Orphan[] = [];
  let totalObjects = 0;

  for (const bucket of buckets) {
    const entries = await listRecursive(supabase, bucket.name);
    totalObjects += entries.length;

    const bucketOrphans = entries.filter((entry) => {
      // Match on the object's own path rather than a reconstructed public
      // URL: a row may store the URL with a different host (a project moved
      // between Supabase instances) or as a relative path, and the
      // bucket-plus-path portion is the part that is always present.
      const needle = `${bucket.name}/${entry.path}`.toLowerCase();
      return !referenced.includes(needle);
    });

    for (const entry of bucketOrphans) {
      orphans.push({ bucket: bucket.name, path: entry.path, size: entry.size });
    }

    const kept = entries.length - bucketOrphans.length;
    console.log(
      `  ${bucket.name.padEnd(16)} ${String(entries.length).padStart(4)} objects  ${String(kept).padStart(4)} referenced  ${String(bucketOrphans.length).padStart(4)} orphaned`,
    );
  }

  const orphanBytes = orphans.reduce((sum, o) => sum + o.size, 0);

  console.log("");
  if (orphans.length === 0) {
    console.log(`  No orphans. All ${totalObjects} objects are referenced by content.`);
    return;
  }

  console.log(`  ${orphans.length} orphaned object(s), ${formatBytes(orphanBytes)}:`);
  for (const orphan of orphans) {
    console.log(`    ${orphan.bucket}/${orphan.path}  (${formatBytes(orphan.size)})`);
  }

  if (!shouldDelete) {
    console.log("");
    console.log("  Nothing was deleted. Re-run with --delete to remove these.");
    console.log("  Take a storage backup first if you want one: npm run backup:storage");
    return;
  }

  console.log("");
  let removed = 0;
  for (const bucket of new Set(orphans.map((o) => o.bucket))) {
    const paths = orphans.filter((o) => o.bucket === bucket).map((o) => o.path);
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.error(`  Removing from ${bucket} failed: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    removed += paths.length;
  }
  console.log(`  Removed ${removed} of ${orphans.length} orphaned object(s), reclaiming ${formatBytes(orphanBytes)}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
