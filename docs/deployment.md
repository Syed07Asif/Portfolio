# Deployment

Everything about getting this site onto the internet and keeping it there:
the Vercel project, the Supabase project, environment variables, the custom
domain, how to roll back when a deploy is bad, and how backups and restores
work.

> **Read this before your first deploy.** The order below matters — Supabase
> has to exist before Vercel can have real environment variables, and the
> domain has to exist before `NEXT_PUBLIC_SITE_URL` can be correct. Doing it
> out of order produces a site that builds fine and has subtly wrong
> canonical URLs, sitemap entries and Open Graph images.

**Contents**

- [The shape of a deployment](#the-shape-of-a-deployment)
- [1. Supabase (production)](#1-supabase-production)
- [2. Vercel](#2-vercel)
- [3. Environment variables](#3-environment-variables)
- [4. Custom domain and HTTPS](#4-custom-domain-and-https)
- [5. Security headers](#5-security-headers)
- [6. Post-deploy smoke test](#6-post-deploy-smoke-test)
- [Admin account](#admin-account)
- [Rolling back](#rolling-back)
- [Backups](#backups)
- [Restoring](#restoring)
- [Routine maintenance](#routine-maintenance)

---

## The live deployment

Filled in when the site actually went live, so nobody has to go digging in a
dashboard to answer "what is this pointed at?"

| | |
| --- | --- |
| **Production URL** | `https://portfolio-ten-brown-24v11dmo3j.vercel.app` |
| **Supabase project ref** | `atujfnmfrftftnkjivzy` |
| **Supabase region** | `ap-southeast-1` (Singapore) |
| **Postgres** | 17.6 |
| **Custom domain** | none yet |
| **Vercel production branch** | `main` |

**The production URL is the awkward one on purpose.** `portfolio-ten-brown.vercel.app`
— the obvious shorter name — **belongs to a different Vercel user entirely**,
and briefly ended up in `NEXT_PUBLIC_SITE_URL` because it answered HTTP 200
to a probe. A 200 from a guessed `*.vercel.app` hostname proves something is
there, not that it is yours. Read the real domain from **Settings → Domains**
and check the page content, never infer it from a status code.

Two things to know when verifying a deploy from a script:

- **Vercel rate-limits aggressive polling.** Forty `curl`s in ten minutes
  from one IP triggered `X-Vercel-Mitigated: challenge`, and every request
  started returning `403` with a "Vercel Security Checkpoint" page. Real
  browsers solve it transparently; scripted checks do not. Wait for a build,
  don't poll it.
- **Check with cache busting.** Immediately after a deploy, `canonical`,
  `og:url` and `sitemap.xml` can still serve the previous build's values from
  the edge/browser cache while `robots.txt` already shows the new ones — which
  looks exactly like a half-applied env var. `fetch(url, {cache: 'reload'})`
  with a query-string buster settles it.

## The shape of a deployment

```
GitHub  Syed07Asif/Portfolio
  │
  ├── main ─────────────► Vercel Production ─────► the custom domain
  │                         (VERCEL_ENV=production)
  │
  └── develop, any PR ──► Vercel Preview ────────► *.vercel.app preview URL
                            (VERCEL_ENV=preview)
                                │
                                └── both talk to ──► Supabase (Postgres + Auth + Storage)
```

Two things follow from this diagram that are easy to get wrong:

- **`main` is the release branch.** Phase work happens on `develop`; `main`
  is what production serves. A deploy to production is a merge to `main`.
- **Preview and Production are separate environments in Vercel, with
  separate environment variables**, but by default they point at the *same*
  Supabase project. That is a deliberate, documented trade-off — see
  [One Supabase project, or two?](#one-supabase-project-or-two) below.

---

## 1. Supabase (production)

### Create the project

1. [supabase.com](https://supabase.com) → **New project**.
2. Pick a region physically close to where the site's visitors are — every
   uncached page render makes a round trip to it.
3. Save the database password somewhere durable at creation time. It is
   shown once. You do not need it for the app (the app uses API keys), but
   you need it for `supabase link` and for direct `psql` access.

### Apply the migrations

The migration files in [`supabase/migrations/`](../supabase/migrations) are
the source of truth for the schema — never edit the schema in the dashboard
and leave it undocumented (CLAUDE.md rule 3).

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`db push` applies every migration that the remote project has not yet
recorded. As of v1.0.0 there are five:

| Migration | What it does |
| --- | --- |
| `20260816102304_create_content_schema.sql` | 15 tables, enums, `updated_at` trigger, `slugify()`, indexes |
| `20260816103908_rls_and_storage.sql` | RLS on every table, `is_admin()`, 8 Storage buckets + policies, base grants |
| `20260818090000_resume_active_swap_function.sql` | `public.set_active_resume(uuid)` |
| `20260818091500_settings_storage_bucket.sql` | 9th bucket (`settings`) + policy refresh |
| `20260822120000_service_role_grants.sql` | Table privileges for `service_role` (needed by the backup scripts) |

Verify, rather than assume, that they landed:

```sql
-- Expect 15 rows, rowsecurity = true on every one of them.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Expect 9 rows: profile, projects, certifications, achievements,
-- experience, education, resume, blog, settings.
select id, public, file_size_limit from storage.buckets order by id;

-- Expect the four portfolio_buckets_* policies.
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects';
```

### Do NOT run the seed against production

`supabase/seed.sql` inserts one placeholder row per table for local
development. `db push` does not run it — but `db reset` does, and **`db reset`
against a linked remote project destroys that project's data.** There is no
reason to ever run `db reset` against production.

### Re-verify RLS with the anon key

This is the check worth doing by hand, because it is the one that fails
quietly. Create an unpublished project in the admin panel, then ask
production for it as an anonymous visitor:

```bash
curl -s "https://<ref>.supabase.co/rest/v1/projects?select=slug,published" \
  -H "apikey: <the-anon-key>"
```

Every row that comes back must have `published: true`. If a draft is in that
list, RLS is not doing its job and the site is leaking unfinished work —
stop and fix it before announcing the URL. See
[docs/architecture.md](./architecture.md#the-rls-model) for what the policies
actually say.

### One Supabase project, or two?

One, for now. Preview and Production both point at the same database.

The upside is that a preview deploy shows you real content, and there is one
place to manage content instead of two. The downside is real and worth
stating plainly: **a preview deployment can write to production data.** A
preview build of a branch that changes an admin form can, if someone logs in
and saves, modify the live site's content.

That is acceptable here because there is exactly one admin and he is the only
person who will ever open a preview deploy. It stops being acceptable the
moment a second person has admin access, or the moment a branch starts
running destructive migrations. At that point, create a second Supabase
project, apply the same migrations to it, and point the Preview environment's
variables at it instead — nothing in the code has to change, because the code
only ever reads the environment.

---

## 2. Vercel

### Connect the repository

1. [vercel.com](https://vercel.com) → **Add New → Project** → import
   `Syed07Asif/Portfolio`.
2. Vercel detects Next.js. **Accept every build setting as detected** —
   framework preset Next.js, build command `next build`, output directory
   `.next`, install command `npm install`. There is no `vercel.json` in this
   repo and there should not be one; everything Vercel needs is either
   auto-detected or in [`next.config.ts`](../next.config.ts).
3. Set **Production Branch** to `main` (Settings → Git). This is the setting
   that makes `main` the release branch and everything else a preview.
4. Node version: whatever Vercel's current default LTS is. The project has no
   `engines` pin and does not need one.

### Do not deploy yet

The first build will fail or produce wrong URLs unless the environment
variables exist first. Add them (next section), *then* deploy.

---

## 3. Environment variables

Four variables. Set them in **Settings → Environment Variables**, and set
Production and Preview **separately** — Vercel lets you tick multiple
environments for one value, and for three of these four that is exactly wrong.

| Variable | Production | Preview | Public? |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | same | Yes — shipped to the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key | same | Yes — shipped to the browser, and safe: RLS is the boundary |
| `SUPABASE_SERVICE_ROLE_KEY` | the service-role key | same | **No. Server-only.** |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | see below | Yes |

### `SUPABASE_SERVICE_ROLE_KEY` must not be `NEXT_PUBLIC_`

This is the single most important line in this document.

Anything prefixed `NEXT_PUBLIC_` is inlined into the JavaScript bundle that
every visitor downloads. The service-role key bypasses Row Level Security
entirely — publishing it would hand every visitor full read/write access to
the database, including the ability to delete everything. Renaming it to
`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` "so it works in a component" is a
catastrophic, irreversible-in-practice mistake (the key is now in every
CDN-cached bundle and in every visitor's browser cache; rotating it is
mandatory, not optional).

The codebase defends this in three places, and all three should stay:

1. [`lib/supabase/admin.ts`](../lib/supabase/admin.ts) imports `server-only`,
   so importing it from a `"use client"` file is a **build error**, not a
   runtime leak.
2. It is the only file in the project that reads the variable at all.
3. The variable name has no `NEXT_PUBLIC_` prefix, so Next will not inline it
   even if something does import it server-side.

To verify after a deploy, ask the deployed bundles directly:

```bash
# Expect: no output. Any output at all is an emergency — rotate the key
# in Supabase (Project Settings → API → service_role → Reset) immediately.
curl -s https://<your-domain>/ \
  | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u \
  | while read -r chunk; do curl -s "https://<your-domain>$chunk"; done \
  | grep -c 'service_role'
```

### `NEXT_PUBLIC_SITE_URL` on Preview

It is the base for canonical URLs, `sitemap.xml`, `robots.txt` and Open Graph
image URLs — [`lib/seo.ts`](../lib/seo.ts)'s `SITE_URL`, which every route's
metadata resolves against.

**Do not give Preview production's domain.** A preview deploy that advertises
`https://example.com` as its canonical is telling crawlers and every social
card cache that unreviewed branch content *is* the production page.

There is no automatic Vercel-URL fallback: unset, `SITE_URL` falls back to
`http://localhost:3000`. That is harmless (a preview's OG card just won't
resolve — `/admin` and `/styleguide` are already `noindex` + disallowed, and
nobody links to preview URLs) but it does mean **you cannot check social-card
rendering on a preview deploy.** OG cards can only be verified against
production, which is why that is check 7 of the
[smoke test](#6-post-deploy-smoke-test) and not something to sign off earlier.

If you want previews to self-describe, set `NEXT_PUBLIC_SITE_URL` on the
Preview environment to the stable branch URL Vercel assigns
(`https://portfolio-git-develop-<scope>.vercel.app`). That covers `develop`;
per-PR deployments still get localhost URLs, because their hostname isn't
known until the build exists.

### Local development

`.env.local` (git-ignored) holds the same four names pointed at the local
Supabase stack. See [README.md](../README.md#environment-variables) and
[`.env.example`](../.env.example).

---

## 4. Custom domain and HTTPS

1. Vercel → project → **Settings → Domains** → add both `example.com` and
   `www.example.com`.
2. Vercel will tell you exactly which DNS records to create at your
   registrar — an `A` record for the apex and a `CNAME` for `www`, or a
   nameserver delegation if you'd rather Vercel run DNS.
3. Choose one canonical host and **redirect the other to it**. Vercel does
   this for you: mark one domain as the primary and set the other to
   "Redirect to" it. Which one you pick doesn't matter much; that you pick
   *one* matters a lot, because two hosts serving identical content is a
   duplicate-content problem and makes analytics and Open Graph caches
   disagree with each other.
4. HTTPS is automatic — Vercel provisions and renews a certificate once DNS
   resolves. It can take a few minutes; the domain shows as "Invalid
   Configuration" until it does, which is normal and not an error.
5. **Set `NEXT_PUBLIC_SITE_URL` to the canonical host you just chose**, with
   the scheme and no trailing slash: `https://example.com`. Then
   **redeploy** — this variable is read at build time, so an existing
   deployment will not pick it up.

### Verify

```bash
# Expect 200, and a Strict-Transport-Security header.
curl -sI https://example.com/ | head -20

# Expect a 30x to the canonical host.
curl -sI https://www.example.com/ | head -5

# Expect http to redirect to https.
curl -sI http://example.com/ | head -5

# Expect every <loc> to be the real domain — not localhost, not *.vercel.app.
curl -s https://example.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' | head

# Expect og:image and og:url on the real domain.
curl -s https://example.com/ | grep -o '<meta property="og:[^>]*>' | head
```

If the sitemap or OG tags show the wrong host, `NEXT_PUBLIC_SITE_URL` is
either unset or was set after the last build. Redeploy.

---

## 5. Security headers

Defined in [`next.config.ts`](../next.config.ts)'s `headers()` and applied to
every response. See
[docs/architecture.md](./architecture.md#security-headers-and-csp) for what
each directive is for and why the CSP is a static header rather than a
per-request nonce.

Two directives are only emitted when `NEXT_PUBLIC_SITE_URL` is `https:` —
`upgrade-insecure-requests` and `Strict-Transport-Security` — because both
assume TLS and `upgrade-insecure-requests` would break the plain-HTTP local
Supabase stack. So **production gets a slightly stronger policy than the one
you see locally**, and that difference is the only one.

Verify after deploying:

```bash
curl -sI https://example.com/ | grep -iE \
  'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|strict-transport'
```

Then check the two things a header dump cannot tell you, in a real browser
with DevTools open:

- **Images load** — both `/_next/image`-optimized ones and direct Supabase
  Storage URLs. A CSP `img-src` mistake shows up as a blocked-resource error
  in the console, not as a broken build.
- **Uploads work** — sign into `/admin`, upload a real image. The uploader
  posts to Supabase Storage over `XMLHttpRequest`, which CSP governs under
  `connect-src`; if that directive is wrong the upload fails with a console
  error and a stuck progress bar.

`SUPABASE_SERVICE_ROLE_KEY` changes nothing here, but the *Supabase URL*
does: the CSP is built from `NEXT_PUBLIC_SUPABASE_URL` at build time, so
moving to a different Supabase project without redeploying leaves a CSP that
blocks the new one.

---

## 6. Post-deploy smoke test

Run all eight, in a browser, against the real domain. They are ordered so an
early failure explains the later ones.

| # | Check | Passes when |
| --- | --- | --- |
| 1 | Homepage | Loads, styled, no console errors |
| 2 | A project page | `/projects/<slug>` renders with its media |
| 3 | Resume | `/resume` downloads a PDF named `Syed-Asif-Resume.pdf` |
| 4 | Admin login | `/admin/login` accepts the real admin credentials |
| 5 | Publish round-trip | Create a project in `/admin`, publish it, and it appears publicly |
| 6 | Storage images | An image uploaded through the admin panel renders on the public site |
| 7 | OG preview | Pasting the URL into Slack/LinkedIn/X renders a card with the right title and image |
| 8 | Draft privacy | An *unpublished* project is **not** reachable publicly and not in `sitemap.xml` |

Check 5 is the one that proves the whole architecture: if adding content
required a code change, this project failed its core principle.

Check 8 is the one people skip. Do not skip it.

> **On caching:** the public site revalidates on a 1-hour fallback, but every
> admin write also revalidates the relevant cache tags immediately (see
> [docs/architecture.md](./architecture.md#caching-strategy)). If a publish
> doesn't appear within a few seconds, that's a bug in tag invalidation, not
> a cache you should wait out.

---

## Admin account

There is exactly one administrator account, for Syed Asif. "Admin" is defined
by a row in `private.admins` referencing a Supabase Auth user — see
[docs/architecture.md's Security section](./architecture.md#what-admin-means)
for why it's an allowlist table rather than a custom JWT claim.

This has to be done manually per Supabase project (dev and prod have separate
`auth.users` tables, so the same person has a different `user_id` in each).
It is an operational step, not something a migration or `seed.sql` can do,
since a real UUID doesn't exist until the account is created.

### Do not use the invite flow

**This app has no invite-acceptance page**, and finding that out the hard way
cost a step during the real deployment. `app/admin/` contains exactly one
auth route — `login/`, a plain email-and-password form. There is no auth
callback, no "set your password" screen, and no password-reset page, because
Phase 17 deliberately built the minimum for a single known administrator.

So an invite email has nowhere to land. The link redirects to whatever
Supabase's **Site URL** setting says (`http://localhost:3000` by default,
which fails outright on a machine with no dev server running), the token is
consumed, and the next click reports `otp_expired`. The same is true of
**Send password recovery** — the email sends, but the link has no destination
in this app.

Manage the password from the dashboard instead. For one admin that is
strictly simpler than the flows it replaces, and it is the documented
approach below.

### Creating the admin account

1. First fix **Authentication → URL Configuration**, even though the steps
   below don't depend on it: set **Site URL** to the production origin and
   add it under **Redirect URLs**. Left at `localhost:3000`, any auth email
   the dashboard sends points at a machine that isn't listening.
2. **Authentication → Users → Add user → Create new user**. Enter the real
   email address, set a password, and tick **Auto Confirm User** — without
   that the account exists but cannot sign in, and the failure looks
   identical to a wrong password.
3. Copy the new user's `id` (a UUID) from the Users table.
4. In the SQL editor for that same project:

   ```sql
   insert into private.admins (user_id) values ('<uuid-from-step-2>');
   ```

   That is the entire grant of admin access — `is_admin()` reads this table
   and nothing else. Don't commit this UUID anywhere; it's
   environment-specific and holds no secret value on its own, but there's no
   reason to record it outside the database that already has it.
4. Confirm by signing in at `https://<your-domain>/admin/login`. A successful
   sign-in that then bounces you back to the login page means the Auth user
   exists but step 3 didn't happen.

### Rotating

- **Password reset:** dashboard → Authentication → Users → select the user →
  **Reset password**, and set the new one there. No change to
  `private.admins` — the `user_id` doesn't change. Do **not** use *Send
  password recovery*: the email arrives, but this app has no page for its
  link to land on (see above).
- **Replacing the account entirely** (new email address): create the new user
  the same way as above, insert its `user_id` into `private.admins`,
  confirm access works, *then* remove the old row:

  ```sql
  delete from private.admins where user_id = '<old-uuid>';
  ```

  `private.admins.user_id` has `on delete cascade` from `auth.users`, so
  deleting the old Auth user cleans up its row automatically if you do that
  first instead.
- **Revoking access without deleting the account:** delete the
  `private.admins` row. The Auth user still exists and can still sign in, but
  `is_admin()` returns `false` for them everywhere, so RLS treats them like
  any other authenticated non-admin visitor.
- **Rotating API keys:** Supabase dashboard → Project Settings → API. Rotating
  the anon key or service-role key requires updating Vercel's environment
  variables **and redeploying** — the values are baked in at build time.

---

## Rolling back

### The site is broken and you need it working now

Vercel → project → **Deployments** → find the last known-good deployment →
**⋯ → Promote to Production**. This is instant (it re-points the alias at an
already-built deployment; nothing rebuilds) and it is always the right first
move. Diagnose afterwards, not while production is down.

### Then fix it in git

Promoting does not change `main`, so the next merge to `main` will redeploy
the broken code. Follow up with either:

```bash
# Undo a bad merge commit, keeping history honest.
git revert -m 1 <bad-merge-sha>
git push origin main
```

or fix forward on `develop` and merge again.

### Rolling back a migration

There is no `down` migration in this project, deliberately — reversible
migrations are a meaningful amount of ceremony for a single-owner portfolio,
and a wrong `down` is more dangerous than no `down`. Rolling back a schema
change means **writing a new forward migration that undoes it**, then
`npx supabase db push`.

If a migration destroyed data, a new migration cannot bring it back. That is
what the database backups are for — see [Restoring](#restoring). This
asymmetry is the reason to take a backup *before* pushing a migration that
drops or rewrites anything.

### Rolling back content

Content is not in git. An accidental delete in the admin panel is recovered
from a backup, not from a deploy rollback — which is the whole argument for
the next section.

---

## Backups

Four things need backing up, and they fail independently.

### 1. The database

**Supabase's own backups.** On the Pro plan, daily automated backups with
7-day retention plus point-in-time recovery are on by default — verify at
Project Settings → Database → Backups. **On the Free plan there are no
automated backups at all**, which is the single most important thing to know
about running this site on Free: if the database is lost, the only copy is
whatever the content export below produced.

To restore, use the dashboard's Backups tab (Pro) or restore a content export
by hand (below). Supabase's restore replaces the whole database — it is not
selective, and it does not restore Storage.

**Take a manual backup before anything risky** (a migration that drops a
column, a bulk edit):

```bash
npx supabase db dump --linked -f backup-$(date +%Y%m%d).sql
```

### 2. Content, as JSON

Provider-independent, human-readable, diffable, and it works when the
Supabase account itself is the problem:

```bash
npm run backup:content -- --env .env.production.local
```

Writes `backups/content/<timestamp>/` — one JSON file per table, plus
`all.json` and a `manifest.json` recording the row counts and the FK-safe
restore order. Uses the service-role key so it captures **unpublished drafts
too**; an export that silently omitted drafts would not be a backup.

### 3. Storage media

**This is the one that a database backup does not cover.** Supabase's
database backups do not include Storage objects, so a project restored from a
database backup alone comes back with every image 404ing.

```bash
npm run backup:storage -- --env .env.production.local
```

Writes `backups/storage/<timestamp>/<bucket>/<the object's own path>`,
preserving paths exactly so a restore is a straight re-upload. Buckets are
discovered from the API rather than hardcoded, so a bucket added by a future
migration is backed up the day it exists. Exits non-zero if *any* object
fails to download — a partial media backup that reports success is the worst
possible outcome.

Both scripts accept `--dry-run`. Use it the first time you point either at
production. Full detail: [`scripts/README.md`](../scripts/README.md).

### 4. Code, and the resume PDF

- **Code:** the GitHub repository is the source-of-truth backup. `main` is
  the released state, tags mark releases (`v1.0.0` is the launch), and every
  developer machine with a clone is an additional full copy of the history.
  Nothing else is needed here — but do confirm the repo is not the *only*
  copy by keeping at least one clone on a machine that isn't the one you
  develop on.
- **Resume PDF:** [`Syed_Asif_Common_Resume1.pdf`](../Syed_Asif_Common_Resume1.pdf)
  is committed at the repository root. That is deliberate and is what
  satisfies "the current resume exists somewhere outside Supabase" — if the
  Supabase project vanished tomorrow, the actual PDF is still in git history.
  **When you upload a new resume through the admin panel, commit the new PDF
  here too.** Nothing enforces this; it is a habit, and it is the whole
  reason the file is tracked.

### Where the exports should live

`backups/` is git-ignored — it holds unpublished drafts and every uploaded
file, and does not belong in the repository. Copy each run somewhere durable
and off this machine: an encrypted cloud folder, an external drive, or a
*private* second repository. A backup that only exists on the laptop that
also has the only clone is not a backup.

### Suggested schedule

| What | How often | How |
| --- | --- | --- |
| Database | Daily | Supabase automated (Pro), or `npm run backup:content` |
| Content JSON | Monthly, **and before any risky change** | `npm run backup:content` |
| Storage media | Monthly, **and after adding significant media** | `npm run backup:storage` |
| Manual `db dump` | Before every migration that drops or rewrites data | `npx supabase db dump --linked` |
| Code | Continuously | `git push` |

"Monthly" is honest for a portfolio, where content changes a few times a year
and the expensive-to-recreate part is the media. If you want this automated,
a GitHub Actions workflow on a `schedule:` trigger with the two Supabase
values in repository secrets runs both scripts unattended — that is
deliberately not set up today (see
[docs/development.md](./development.md#future-work)).

---

## Restoring

### From a Supabase database backup

Dashboard → Project Settings → Database → Backups → restore the chosen point.
This replaces the entire database. **It does not restore Storage** — after
it completes, re-upload media from a storage export (below) or the images
will be missing even though every row references them correctly.

### From a content export

The export directory has one JSON file per table plus `manifest.json`, whose
`restoreOrder` array lists the tables in foreign-key-safe order. Restore in
that order — a `skills` row cannot be inserted before its `skill_categories`
row exists.

For each table, insert the rows from its file with the service-role key (RLS
would otherwise block writes). The rows contain their original `id`s, so
foreign keys and Storage paths stay valid and nothing has to be re-linked.

Two things to know before you start:

- **The single-row tables** (`profile`, `site_settings`) have a `is_singleton`
  unique constraint. If a row already exists, `UPDATE` it rather than
  inserting a second one — see
  [docs/database.md](./database.md#rules).
- **`resumes.is_active`** has a partial unique index allowing only one active
  row. Restore with all rows inactive, then promote one with
  `select public.set_active_resume('<uuid>')`.

### Restoring Storage media

The storage export mirrors bucket and path exactly, so restoring is uploading
each file back to the same bucket at the same path. With the service-role key:

```bash
# For one bucket, from inside a backups/storage/<timestamp>/ directory.
# The path after the bucket name must match the original exactly, or the
# file_url values in the content export will point at nothing.
curl -X POST "https://<ref>.supabase.co/storage/v1/object/<bucket>/<path>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "x-upsert: true" \
  --data-binary "@<local-file>"
```

`manifest.json` lists every object with its bucket, path and MIME type, which
is what makes scripting the loop straightforward.

### After any restore

Re-run the [post-deploy smoke test](#6-post-deploy-smoke-test). A restore that
brought back rows but not media passes checks 1–5 and fails check 6, which is
exactly the failure this section exists to prevent.

---

## Routine maintenance

- **Free-tier projects pause after inactivity.** A paused Supabase project
  makes the whole site's content unreachable. The site degrades gracefully
  rather than crashing (see
  [docs/architecture.md](./architecture.md#resilience)), but it degrades to
  empty. If the site runs on Free, load it occasionally, or move to Pro.
- **Dependency updates:** `npm outdated`, update, run `npm test` and
  `npm run test:e2e`, and deploy through a preview first. Next.js majors in
  particular have moved fast enough that CLAUDE.md carries a standing warning
  to read `node_modules/next/dist/docs/` rather than trusting memory.
- **Sweep orphaned Storage objects occasionally.** Deleting a record now
  reclaims the files it owns, but two things still strand files: anything
  left over from before that was fixed, and uploads that succeed and are then
  abandoned (the admin replaced an image before saving, or closed a
  half-filled create form). `npm run storage:orphans` reports what nothing
  references; add `--delete` to remove it. Worth running once or twice a year,
  or any time Storage usage looks higher than the content justifies.
