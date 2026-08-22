# scripts/

Operational scripts. These are **not application code** — nothing in `app/`,
`components/`, `lib/` or `hooks/` imports from here, and nothing here runs in
a browser or inside Next. They are things a human (or a scheduled job) runs
from a terminal against a Supabase project.

That distinction is why these query Supabase directly rather than going
through `lib/data`, which CLAUDE.md otherwise names as the only layer allowed
to. `lib/data` is the *site's* data access layer: it is typed to the domain
model, wrapped in `unstable_cache`, and shaped around what a page needs to
render. A backup needs the opposite of all three — raw rows exactly as
stored, no caching, no domain shaping, and every column including ones the
site never reads. Routing a backup through `lib/data` would produce a file
that restores the site's *view* of the content rather than the content.

## What's here

| Script | npm script | What it does |
| --- | --- | --- |
| `export-content.ts` | `npm run backup:content` | Writes every row of all 15 content tables to `backups/content/<timestamp>/`, one JSON file per table plus `all.json` and `manifest.json`. |
| `export-storage.ts` | `npm run backup:storage` | Downloads every object in every Storage bucket to `backups/storage/<timestamp>/<bucket>/<path>`, plus a `manifest.json`. |
| `sweep-orphans.ts` | `npm run storage:orphans` | Reports Storage objects that no content row references. Deletes them only with `--delete`. |
| `lib/backup-env.ts` | — | Shared env resolution for all three. Not a script. |
| — | `npm run backup` | Both exports, in order. |

`backups/` is git-ignored. It holds real content — including unpublished
drafts and every uploaded file — and belongs in private storage off this
machine. See [docs/deployment.md](../docs/deployment.md)'s Backups section
for where it should actually go and how to restore from it.

## Choosing which project you're backing up

Both scripts need `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`,
and resolve them in this order:

1. **Variables already set in the shell** — highest priority. This is how a
   scheduled job or CI supplies them, and it means production's service-role
   key never has to be written to disk.
2. **An env file**, named with `--env <path>`, defaulting to `.env.local`.

So a bare `npm run backup` backs up *local dev*, which is almost never what
you want in anger. To back up production:

```bash
npm run backup:content -- --env .env.production.local
```

…with that file holding production's URL and service-role key, and being
git-ignored (`.env*.local` already is). Or set the two variables in the shell
and run it with no flag at all.

Every run prints which host it read from before it does anything, so a
mistake is visible in the first three lines rather than discovered later.

## Why they use the service-role key

A backup that omits unpublished drafts is not a backup. The anon key sees
only `is_published = true` rows — that is exactly what the RLS model is for,
see [docs/architecture.md](../docs/architecture.md)'s Security section — so a
complete export must run as `service_role`, which bypasses RLS. That is also
why these must only ever be run from a machine you trust, and never wired
into anything that reaches a browser.

The `service_role` role had no table privileges at all until Phase 25's
`20260822120000_service_role_grants.sql`; `export-content.ts` was the first
thing in the project to actually use that credential against a content table,
and it failed with `42501 permission denied for table profile` on its first
run. If you see that error, the migration has not been applied to whichever
project you're pointed at.

## The orphan sweep

`npm run storage:orphans` answers "which uploaded files is nothing pointing
at any more?" It reads every column of every content table, collects every
string, and flags a Storage object only if its `bucket/path` appears in none
of them. Reading every column rather than a list of known file columns means
a column added later is covered automatically — and that the failure mode of
an unknown column is keeping a genuine orphan, not deleting a live one.

It reports and exits. `--delete` is required to remove anything:

```bash
npm run storage:orphans                      # report
npm run storage:orphans -- --delete          # actually remove
npm run storage:orphans -- --env .env.production.local
```

Read the report before deleting. A surprisingly large orphan count usually
means the wrong project, not a lot of garbage.

Two things produce orphans even now that the create-form bug is fixed
(`resolveNewRecordId` in `lib/actions/shared.ts`): files stranded by that old
behaviour, which no delete will ever reach; and uploads that succeed and are
then abandoned, because the admin replaced the image before saving or closed
a half-filled create form. Nothing but a sweep can identify the second kind.

## Both export scripts support `--dry-run`

Prints exactly what would be exported — table row counts, bucket object
counts, total size — and writes nothing. Worth using the first time you point
either script at production, to confirm you're reading the project you think
you are before it starts writing gigabytes of media to disk.

## Exit codes

Both exit non-zero on failure, so a scheduled run fails visibly:

- `export-content.ts` exits 1 if the export is **empty**, on the grounds that
  a portfolio with zero rows is a misconfiguration, not a valid backup.
- `export-storage.ts` exits 1 if **any object fails to download**, after
  attempting all the others and listing the failures. A partial media backup
  that reports success is the worst possible outcome.
