import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Env loading for the operational scripts in `scripts/`.
 *
 * These run outside Next, so nothing loads `.env.local` for them the way
 * `next dev`/`next build` does — and they are deliberately *not* wired to
 * `.env.local` only, because their whole point is being pointed at a
 * different environment from the one you develop against. Backing up
 * production means running them against production.
 *
 * Resolution order, highest priority first:
 *
 * 1. Variables already set in the shell. This is what CI, a cron job, or a
 *    one-off `SUPABASE_SERVICE_ROLE_KEY=... npm run backup:content` uses,
 *    and it means a secret never has to be written to disk to take a
 *    backup.
 * 2. The env file named by `--env <path>` (default `.env.local`), if it
 *    exists. A missing file is not an error — case 1 may have supplied
 *    everything already.
 *
 * The parser is deliberately tiny rather than pulling in `dotenv`: it needs
 * to handle `KEY=value`, `#` comments, blank lines and optional surrounding
 * quotes, and nothing else. Anything more elaborate in a portfolio's env
 * file would itself be the bug.
 */

export interface BackupEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  /** Host only — safe to print and to record in a manifest. */
  supabaseHost: string;
  /** Which env file (if any) actually contributed values. */
  envFile: string | null;
}

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Reads `--env <path>` out of argv, defaulting to `.env.local`. */
export function envFileFromArgv(argv: string[] = process.argv.slice(2)): string {
  const index = argv.indexOf("--env");
  const value = index === -1 ? undefined : argv[index + 1];
  return value ?? ".env.local";
}

/**
 * Fails loudly and specifically. A backup script that silently produces an
 * empty directory because a key was missing is worse than one that doesn't
 * run at all — you only find out when you need the backup.
 */
export function loadBackupEnv(argv: string[] = process.argv.slice(2)): BackupEnv {
  const envFileName = envFileFromArgv(argv);
  const envFilePath = resolve(process.cwd(), envFileName);

  let fromFile: Record<string, string> = {};
  let envFile: string | null = null;
  if (existsSync(envFilePath)) {
    fromFile = parseEnvFile(readFileSync(envFilePath, "utf8"));
    envFile = envFileName;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fromFile.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? fromFile.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  // `missing.length > 0` doesn't narrow `supabaseUrl`/`serviceRoleKey` for
  // the compiler, so the guard is written against the values themselves.
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Missing ${missing.join(" and ")}.\n` +
        `Set them in the shell, or put them in an env file and pass --env <path>.\n` +
        (envFile
          ? `Looked in ${envFileName}, which exists but does not define ${missing.join("/")}.`
          : `Looked for ${envFileName}, which does not exist.`) +
        `\n\nTo back up PRODUCTION, use production's own values — the service-role key\n` +
        `is on the Supabase dashboard under Project Settings -> API. Do not commit it.`,
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    supabaseHost: new URL(supabaseUrl).host,
    envFile,
  };
}

/**
 * A filesystem-safe UTC timestamp, used as the backup directory name.
 * Sorts chronologically as a plain string, which is what makes
 * `ls backups/content | tail -1` mean "the most recent backup".
 */
export function backupStamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
}
