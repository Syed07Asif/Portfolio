import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { backupStamp, loadBackupEnv } from "./lib/backup-env";

/**
 * Exports every content row as JSON — the "what the portfolio contains"
 * half of the backup story, the counterpart to `export-storage.ts`'s "the
 * files it points at."
 *
 * ## Why this exists when Supabase already takes database backups
 *
 * Supabase's own backups are Postgres backups: they restore *into
 * Supabase*, they are only retained for a window that depends on the plan
 * (7 days on Pro; on Free there is no point-in-time restore at all), and
 * on a paused Free-tier project they are not something you can casually
 * reach for. This produces a plain, human-readable, provider-independent
 * copy that can be committed to a private repo, dropped in cloud storage,
 * diffed year over year, or hand-fed back into a fresh project. It is the
 * backup that still works when the Supabase account itself is the problem.
 *
 * ## Why it uses the service-role key
 *
 * A backup that silently omits unpublished drafts is not a backup. The
 * anon key sees only `is_published = true` rows (that is exactly what the
 * RLS model is for — see docs/architecture.md), so a complete export has
 * to run with the service-role key and therefore has to run server-side,
 * from a trusted machine, never from the browser.
 *
 * ## Restore
 *
 * See docs/deployment.md's "Restoring from a content export" — the short
 * version is that TABLES below is in foreign-key-safe order, so restoring
 * is inserting each file's rows in that order, and `--dry-run` here lets
 * you confirm what you have before you touch anything.
 */

/**
 * Every content table, in an order that is safe to insert in: a table only
 * ever appears after the tables it references. This mirrors the order the
 * tables are created in supabase/migrations/20260816102304_create_content_schema.sql,
 * which is FK-safe by construction.
 *
 * Adding a content table means adding it here. That is deliberate: an
 * automatic `information_schema` sweep would also pick up whatever future
 * non-content table someone adds (a job queue, an analytics rollup) and
 * quietly change what "a content backup" means. The list is short and the
 * cost of forgetting is caught by the row-count summary this prints.
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

/**
 * PostgREST caps a single response (`max-rows`, 1000 by default on hosted
 * Supabase). Nothing in this portfolio is remotely near that, but a backup
 * that silently truncates is the exact failure mode worth spending ten
 * lines to rule out — so every table is read in explicit pages until a
 * short page comes back.
 */
const PAGE_SIZE = 500;

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const env = loadBackupEnv(argv);

  const supabase = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = backupStamp();
  const outDir = resolve(process.cwd(), "backups", "content", stamp);

  console.log(`Content export`);
  console.log(`  source : ${env.supabaseHost}${env.envFile ? ` (via ${env.envFile})` : ""}`);
  console.log(`  target : ${dryRun ? "(dry run — nothing will be written)" : outDir}`);
  console.log("");

  if (!dryRun) mkdirSync(outDir, { recursive: true });

  const counts: Record<string, number> = {};
  const everything: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Reading ${table} failed: ${error.message} (${error.code ?? "no code"})`);
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
    }

    counts[table] = rows.length;
    everything[table] = rows;
    if (!dryRun) {
      writeFileSync(join(outDir, `${table}.json`), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    }
    console.log(`  ${table.padEnd(22)} ${String(rows.length).padStart(5)} rows`);
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const manifest = {
    kind: "portfolio-content-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    source: env.supabaseHost,
    /**
     * Restore order is the file order, and it is load-bearing — see TABLES
     * above. Recording it in the manifest means a restore does not depend
     * on whoever is doing it still having this script.
     */
    restoreOrder: [...TABLES],
    rowCounts: counts,
    totalRows: total,
  };

  if (!dryRun) {
    writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    writeFileSync(
      join(outDir, "all.json"),
      `${JSON.stringify({ manifest, tables: everything }, null, 2)}\n`,
      "utf8",
    );
  }

  console.log("");
  console.log(`  ${total} rows across ${TABLES.length} tables`);
  if (dryRun) {
    console.log(`  dry run — nothing written`);
  } else {
    console.log(`  written to backups/content/${stamp}/`);
    console.log(`  (one file per table, plus all.json and manifest.json)`);
  }

  /**
   * An empty export is almost always a misconfiguration — the wrong
   * project, a revoked key, a fresh database — rather than a portfolio
   * with genuinely no content. Exiting non-zero makes a scheduled run fail
   * visibly instead of quietly archiving nothing.
   */
  if (total === 0) {
    console.error("");
    console.error("  WARNING: the export is empty. Check that the URL and key point at the");
    console.error("  intended project. Exiting non-zero so an automated run does not treat");
    console.error("  this as a successful backup.");
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
