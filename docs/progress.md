# Build Progress

A phase-by-phase log of this build, kept so a new chat session (a fresh
context window with no memory of prior conversations) can pick up exactly
where the last one left off. This file answers "what's been done and why";
[CLAUDE.md](../CLAUDE.md), [docs/architecture.md](./architecture.md), and
[docs/database.md](./database.md) answer "how does it work" — read those
for the actual reference material, this one for history and continuity.

**To resume work in a new session:** read this file, then CLAUDE.md, then
skim `git log --oneline` and `git status` to confirm nothing has changed
since the "Where things stand" section below was last updated — see that
section's own "Latest commit" bullet for the exact hash this was written
against. Each phase's commit message
also has a detailed writeup — `git show <hash>` for the full reasoning
behind a specific phase if this summary isn't enough.

## ⛳ START HERE — current state (the build is FINISHED and DEPLOYED)

**Everything below this section is history.** Read this block first; the
phase log is only needed for *why* a decision was made.

| | |
| --- | --- |
| **Status** | Live in production. All 25 phases complete. |
| **Live site** | `https://portfolio-ten-brown-24v11dmo3j.vercel.app` |
| **Admin** | `/admin/login` — real Supabase Auth user, password is in the owner's password manager (not recoverable by email, see below) |
| **Supabase project** | `atujfnmfrftftnkjivzy` (`ap-southeast-1`, Postgres 17.6, **free plan — no automatic backups**) |
| **Vercel** | deploys `main` automatically on push |
| **Latest tag** | `v1.0.4` |
| **Branches** | `develop` and `main` in sync, tree clean |
| **Resume point** | `038bbc2` on `develop` — the commit this block was written against |

### What is left to do

**Nothing is required.** The site works, is secure, and is backed up.
Everything remaining is optional and listed in
[docs/development.md](./development.md)'s FUTURE WORK: the blog (schema and
admin exist, no public route), analytics, project filtering/search, a contact
form, and — added during deployment — an email password-reset flow.

The one thing an owner should *do periodically* is `npm run backup` after
meaningful content changes, because the Supabase free plan takes no backups
of its own. The latest backup lives in `backups/` (git-ignored, but inside
the OneDrive-synced folder, so it has an offsite copy).

### If you are restarting work here

1. `git log --oneline -1` should show the commit this was written against
   (see the "Latest commit" bullet in "Where things stand"), and
   `git status --short` should be empty.
2. **Adding content needs no code and no local setup at all** — it is done
   through `/admin` on the live site. Only reach for the local stack if you
   are changing *behaviour*.
3. For code changes, follow the Phase 24 checklist below to bring up Docker,
   the local Supabase stack and a server, then `npm test` / `npm run test:e2e`
   before believing anything is safe.
4. Deploy by merging `develop` into `main` and pushing. Vercel does the rest;
   allow ~5 minutes, and see the deployment notes about *not* polling the site
   while you wait.

### Five things that will bite you, all learned the hard way

Each of these cost real time during deployment and none is visible in the
code. Full write-ups are in the final entries of this file.

1. **`??` does not fall back on `""`.** An env var that exists but is empty
   crashed the first production build with an error naming an unrelated
   route (`/_not-found`). Fixed in `v1.0.2`, with tests.
2. **The admin invite / password-reset emails do not work** — this app has
   no auth-callback page, only a login form. Manage the password in the
   Supabase dashboard. See [docs/deployment.md](./deployment.md).
3. **`revalidatePath` does not reach Next's metadata routes.** That is why
   `app/sitemap.ts` is `force-dynamic` rather than ISR-cached (`v1.0.4`).
   A route cache and a data cache are different things.
4. **A `loading.tsx` turns `notFound()` into a soft 404**, because the
   response streams and the status flushes first. That is why
   `app/(site)/projects/[slug]/` deliberately has none (`v1.0.3`).
5. **Do not poll a fresh Vercel deploy.** ~40 requests in ten minutes trips
   its bot protection and every scripted request starts returning 403.

### Start-of-session checklist — LOCAL DEVELOPMENT ONLY (from Phase 24)

> Only needed if you are changing code. Content editing happens on the live
> site and needs none of this.

> **Resuming mid-build?** Phases 1–24 are complete. **Phase 24 (verify and
> harden) is done** — accessibility, performance and a real test suite; read
> its entry below for the measured before/after numbers, the eight defects it
> found and fixed, and the three it found and deliberately did not fix.
>
> There is now a test suite: `npm test` (Vitest, 52) and `npm run test:e2e`
> (Playwright, 33 × Chrome and Edge). Both need the local Supabase stack up
> *and* a production server (`npm run build && npm run start`) — Playwright
> will start one itself, but reuses an existing one. Run them before
> believing any change is safe.

Run these four commands first; each one's expected output is stated so a
mismatch is obvious immediately rather than three steps later.

```bash
git log --oneline -1        # expect: the Phase 24 commit (see "Latest commit")
git status --short          # expect: empty — a clean tree
docker ps --format '{{.Names}}' | grep supabase   # expect: 5 containers
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/   # expect: 000 (no server yet)
```

Then, in order:

1. **Docker Desktop must actually be running** — `docker info` first. If
   the five `supabase_*_syed-asif-portfolio` containers aren't listed, see
   "To stand up the local stack" below (and note the `--exclude` flag set
   there now keeps **both** `gotrue` and `storage-api`).
2. **Start a server.** For *feature work*, `npm run dev` (or `preview_start`
   with `{"name": "portfolio-dev"}`). For *anything you intend to measure or
   test*, `npm run build && npm run start` instead — Phase 24's whole point
   is that dev-mode numbers are meaningless, and Playwright's config expects
   a production server on port 3000 (it starts one itself but reuses an
   existing one). Port 3000 was free at the end of Phase 21. If it *isn't*,
   read the "Dev server" bullet below before trying to fix it — the obvious
   fix (`autoPort`) does not work, for a non-obvious reason.
   **Do not run `npm run build` while Playwright or Lighthouse is running** —
   they collide, and Playwright's `webServer` teardown will kill a server
   Lighthouse is mid-run against (it reports `CHROME_INTERSTITIAL_ERROR`,
   which looks like an app fault and is not one).
3. **Confirm the stack is actually reachable**, not merely running — a
   container being "up" doesn't prove `.env.local`'s keys still match it
   (a `stop`/`start` cycle can regenerate the JWT signing material; a `db
   reset` does not). One request settles it:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/projects?select=slug&limit=1" \
     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
   ```
   `200` means good; `401`/`PGRST301` means re-derive both keys from `npx
   supabase status -o env` and update `.env.local`.
4. **To log into `/admin`**, use `test-admin@example.com` /
   `Test-Admin-Pass-123!`. If it fails, the account was wiped by a `db
   reset` — recreating it is two commands, in the Supabase bullet below.
   The E2E suite uses these same credentials (`tests/e2e/helpers.ts`), so a
   wiped admin account fails every Playwright test at once.
5. **Run the test suite before changing anything**, so you know whether a
   later failure is yours:
   ```bash
   npm test           # Vitest — 52 tests, ~2s, needs Supabase only
   npm run test:e2e   # Playwright — 33 tests × Chrome and Edge, ~7min
   ```
   Both were green at the end of Phase 24. The E2E suite creates rows
   prefixed `zz-phase24` and deletes them in `afterAll`; if a run is
   interrupted, `select slug from projects where slug like 'zz-%'` will show
   leftovers to clean up. It also asserts the seeded
   `customer-churn-prediction` project is left untouched, because an early
   version of it really did unpublish that row.

**Before running `npx supabase db reset`** (needed whenever a new migration
is added): it wipes `auth.users` and `private.admins` too, so budget for
recreating that admin account afterward. This bit Phase 21.

## Where things stand

> **Phases 1-25 are complete, and the site is DEPLOYED and live** at
> `https://portfolio-ten-brown-24v11dmo3j.vercel.app` (Supabase project
> `atujfnmfrftftnkjivzy`). See the deployment entry at the very end of this
> file for what was done and the three real problems it surfaced; live
> details are in [docs/deployment.md](./deployment.md#the-live-deployment).
> Real content is in (projects, profile, resume) and a full **post-launch
> smoke test has passed**, including the unpublished-content check against a
> real draft — see the final entry in this file for the two defects it found
> and the three measurement traps it hit. Latest release tag is `v1.0.4`.
> Content and Settings are filled in, backups have been taken and validated,
> and the final entry records the two-attempt sitemap fix (`revalidatePath`
> does not reach metadata routes). **The build is finished and the site is
> fully live** — what remains is ordinary content editing.
>
> *(Historical, from before the deploy:)* The codebase is
> release-ready and tagged `v1.0.0` on `main`. **It is not deployed.**
> Everything that needs Syed's own Vercel / Supabase / registrar accounts —
> creating the hosted Supabase project, connecting Vercel, the custom domain,
> and the production smoke test — is an ordered runbook in
> [docs/deployment.md](./deployment.md), written but **not executed**, because
> this session cannot create accounts or enter credentials. Read Phase 25's
> log entry at the very bottom of this file for the full account, including
> what it found and fixed.
>
> Phase 25 changed four things in the code: security headers + CSP in
> `next.config.ts`, `images.dangerouslyAllowLocalIP` gated on a local Supabase
> host (a real Next 16 behaviour, see the entry), a fifth migration granting
> `service_role` the table privileges it never had, and a new `scripts/`
> folder holding the two backup/export scripts. Docs were rewritten wholesale.
>
> **A follow-up after that** fixed the Storage orphan bug the Phase 25 entry
> had recorded as unfixed *and misdiagnosed*: the leak was on the **create**
> path, not the delete path — a create form's placeholder upload folder was
> never adopted as the row's id, so anything uploaded before a first save was
> orphaned forever, invisibly. `createX` actions now take the record id as
> their first argument. See the last entry in this file; it is the one worth
> reading before touching any create action. E2E is now **70 tests** (was 66).


**Phases 1–24 are done and verified. Phase 24 (verify and harden) is
complete** — axe-core reports **0 violations across all five audited pages**
(3 violation types / 9 nodes before), Lighthouse is **100 desktop / 91–95
mobile** with **CLS 0.000**, and there is now a real test suite (52 Vitest +
33 Playwright, green in both Chrome and Edge). Its entry below has the full
before/after tables, the eight defects it found and fixed — including a
mobile menu whose overlay collapsed to **zero height**, and 20 transition
utilities that generated **no CSS at all** — and the three it found and
deliberately left, each with the reasoning. **The one target not met is
homepage mobile LCP (3,340ms against 2,500ms)**; it is now bandwidth-bound,
and the only remaining lever is an architectural decision about Framer
Motion that belongs to the owner. **The admin panel is complete** — every
sidebar destination is now a real editor; no `ComingSoon` placeholder pages
remain (`components/admin/ComingSoon.tsx` itself was deleted after Phase 25,
having been unused since Phase 21 — it is in git history if it is ever
wanted back). Phase 21's own log entry below has the
full narrative, including two real bugs found live.

**Phase 22 (SEO and social sharing) is done and verified** — per-route
metadata built from the database, generated 1200x630 Open Graph cards per
project, schema.org JSON-LD (validated clean at validator.schema.org),
`sitemap.xml`/`robots.txt`, and a semantic-HTML audit run against the real
served markup that found and fixed five genuine defects. Reference material
is in [docs/architecture.md](./architecture.md)'s "SEO & social sharing"
section; the narrative, including four things that could only be found by
running them, is in this file's Phase 22 log entry below. **Two things it
could not verify are recorded there honestly**: Google's Rich Results Test
is behind a reCAPTCHA, and every external social-card validator needs a
public URL the undeployed site doesn't have yet.

**Phase 23 (resilience) is done and verified** — error/not-found/loading
routes across the public site and admin, per-section Suspense streaming,
real upload progress, actionable upload/auth failure messages, and a
field-by-field empty-state audit run against the real database
([docs/empty-states.md](./empty-states.md)). **Five real defects were found
by deliberately breaking things**, none of them visible in the source: a
database outage was indistinguishable from empty content (and got cached
for an hour); `error.tsx` turned out not to cover statically generated
pages, so an outage on an ISR route returned raw "Internal Server Error"
text in production; `connection()` reproduced that same 500 rather than
fixing it; the middleware turned an outage into an unparseable Server
Action response with a permanently stuck optimistic UI; and admin auth
answered every failure with "you must be signed in." Full narrative in this
file's Phase 23 entry below; reference material in
[docs/architecture.md](./architecture.md)'s "Resilience" section.

Phase 18 ("shared admin
infrastructure") had one earlier, failed attempt — removed entirely and
rebuilt from scratch in a second attempt, which succeeded. All six
required operations (create, edit, publish, unpublish, delete, reorder)
were verified **live, with real clicks in a real browser**, against the
real local Supabase stack, with the result confirmed both in Postgres
directly and reflected on the public site — not assumed from the code.
The full narrative, including two real bugs found and fixed along the
way, is in this file's Phase 18 log entry below and in
[docs/content-management.md](./content-management.md)'s "Two real bugs"
section. Test rows created during verification were cleaned up afterward
(`education` table is back to exactly `supabase/seed.sql`'s one row).
**Phase 19** (Profile, Skills, Experience admin modules) is done and
verified the same way — full narrative in this file's Phase 19 log entry
below and in content-management.md's "Two more real bugs" section; every
table involved (`profile`, `skill_categories`, `skills`, `experience`) is
back to exactly `supabase/seed.sql`'s original content after test-row
cleanup. **Phase 20** (the Projects admin module — CLAUDE.md's "most
important admin module") is done and verified the same way; three real
bugs were found and fixed live (two of them latent in already-shipped
Phase 18/19 shared code, only surfaced because Phase 20 was the first to
actually exercise those exact code paths for real) — full narrative in
this file's Phase 20 log entry below and in
content-management.md's "Real bugs found and fixed while proving Phase
20" section. The `projects` table (plus `project_technologies`,
`project_features`, `project_media`, and the `projects` Storage bucket)
is back to exactly `supabase/seed.sql`'s original content after test-row
cleanup. **Phase 21** (Certifications, Achievements, Contact, Resume,
Settings, draft-mode preview, and the minimal Blog module — the phase that
completes the admin panel) is done and verified the same way; two real bugs
were found and fixed live, one of them a repeat of Phase 19's
relative-asset-path validation bug across five *more* schemas — full
narrative in this file's Phase 21 log entry below and in
content-management.md's "Phase 21 additions to shared infrastructure" and
"Two real bugs, found live while building Phase 21" sections. Every table
is back to exactly `supabase/seed.sql`'s content (verified row-for-row —
one row each across all 15 tables, zero objects in every Storage bucket)
after test-row cleanup. **Phases 20 and 21 are committed and pushed** as
`8b9d2f6` — see the "Latest commit" bullet below.

- **Two new migrations were added in Phase 21** and have been applied
  locally via `npx supabase db reset`:
  `20260818090000_resume_active_swap_function.sql` (the atomic
  `public.set_active_resume(uuid)` swap) and
  `20260818091500_settings_storage_bucket.sql` (a `settings` Storage bucket
  for the default OG image, plus the four `storage.objects` policies dropped
  and recreated with it included). `types/database.ts` was regenerated
  (`npx supabase gen types typescript --local`) to pick up the new RPC.
  **Note `db reset` wipes `auth.users` and `private.admins`**, so the
  local test admin account had to be recreated afterward — see the account
  bullet below and Phase 17's log entry for the exact steps.

- **Branch:** `develop` for work; **`main` now holds the release.** Phase 25
  merged `develop` into `main` as `2b9d630` ("Release v1.0.0") and tagged
  **`v1.0.0`**; both are pushed. Before that, `main` had been the Phase 1
  scaffold (`c859f71`) with nothing merged up. Both branches track
  `https://github.com/Syed07Asif/Portfolio.git`, and `main` and `develop`
  are identical in content — `git diff develop main` is empty.
- **Phase 24 tooling is installed but unused.** `lighthouse`, `axe-core`,
  `vitest` and `@playwright/test` are in `devDependencies` (committed, so
  the tree is clean and a fresh session doesn't have to re-install). No
  Playwright browsers were downloaded and no test/config files exist yet —
  nothing in `app/`, `components/` or `lib/` was touched by Phase 24.
- **Server state at the end of Phase 23:** same as Phase 22 — a
  *production* server (`npm run build && npm run start`) is running on port
  3000, because the ISR/static-generation failure path in Phase 23 is only
  reproducible in a real build. **All five Supabase containers were stopped
  and restarted individually during this phase** (`supabase_db_*`,
  `supabase_rest_*`, `supabase_kong_*`, `supabase_storage_*`) to force real
  outages; all are up and healthy again, the database matches
  `supabase/seed.sql` exactly (verified with `EXCEPT`), Storage holds zero
  objects, and the local admin account still works. The Phase 22 note below
  still describes the port-3000 situation accurately.
- **Server state at the end of Phase 22:** a *production* server (`npm run
  build && npm run start`, not `next dev`) was left running on port 3000 —
  that's what the metadata/sitemap/OG-card verification was done against,
  since metadata routes only prerender in a real build. A new session
  should expect port 3000 to be occupied by it, and can either reuse it or
  stop it (`Get-NetTCPConnection -LocalPort 3000 -State Listen` ->
  `Stop-Process`) before starting `next dev`. Note `.next` now holds a
  production build, so the first `npm run dev` after this will recompile
  from cold. The historical note below is from Phase 21 and still describes
  the dev-server behaviour accurately.
- **Dev server: NOT running** as of the end of the Phase 21 session
  (verified — `curl http://localhost:3000/` got no response). For most of
  that session a *different* chat session's server held port 3000; it has
  since stopped, so **port 3000 is free and a new session can just start
  its own normally**: `preview_start`/`{"name": "portfolio-dev"}` (or `npm
  run dev`). Two things worth knowing before fighting a port conflict if
  one does reappear: (1) **Next 16's dev-server lock is keyed to the
  project directory, not the port** — setting `"autoPort": true` in
  `.claude/launch.json` does *not* help; the second instance binds its
  assigned port, logs "Another `next dev` server is already running", and
  **exits 1**, so the failure looks like a successful start followed by an
  immediate exit rather than a bind error. The documented fix (Phases
  14/15/21) is to point the Browser pane at the already-running origin,
  which picks up saved edits via normal HMR. (2) **Don't `rm -rf .next`
  while another session's server is running against this directory** — it
  owns that folder; Phase 21 did it anyway (to clear a stale type cache)
  and forced that server into a cold recompile. It recovered, but `npx next
  typegen` or a full `next build` regenerates the route types without
  deleting anything. Note a bare `npx tsc --noEmit` with no `.next`
  present fails with two spurious `Cannot find name 'LayoutProps'` errors,
  since that global is generated into `.next/types` — run `next build`
  first before trusting a standalone `tsc`.
- **New dependencies added in Phase 18** (already `npm install`ed, in
  `package.json`): `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  (drag-to-reorder — `AdminTable` and `MultiImageUploader`), plus two more
  shadcn components generated into `components/admin/ui/`: `switch.tsx`,
  `textarea.tsx`. No new dependencies were needed for Phase 20.
- **Latest commit:** `42ef9ac` — "Phase 25: launch readiness — security
  headers, backups, and documentation," pushed to `origin/develop` (16 files
  — `git show 42ef9ac --stat`; the commit message carries the full
  reasoning and this file's Phase 25 entry the narrative). `develop` was
  then merged into `main` as **`2b9d630`** and tagged **`v1.0.0`**, both
  pushed. This very edit (recording those hashes) is a docs-only follow-up
  on top of `42ef9ac`, so expect `git log --oneline` on `develop` to show
  one commit above it that changed nothing but `docs/progress.md` — and
  note `main` will then be one commit *behind* `develop` again until that
  follow-up is merged up, which is expected and not a problem.
  Before that, `b427693` — "Phase 24: verify and harden —
  accessibility, performance, and a test suite," pushed to `origin/develop`
  (39 files — `git show b427693 --stat`; the commit message carries the full
  reasoning, and this file's Phase 24 entry the narrative, including the
  eight defects found by measuring and the three deliberately left). This
  very edit (recording that hash) is a docs-only follow-up on top of it, so
  expect `git log --oneline` to show one commit above `b427693` that changed
  nothing but `docs/progress.md`.
  Before that, `117bbd2` — "Phase 24 groundwork: measurement/test
  tooling, and a handoff note in progress.md," pushed to `origin/develop`.
  It touches only `package.json`, `package-lock.json` and this file; no
  application code.
  Before that, `88902c5` — "Phase 23: resilience — error pages,
  loading states, and a real empty-state audit," pushed to `origin/develop`
  (53 files — `git show 88902c5 --stat`; the commit message carries the full
  reasoning and this file's Phase 23 entry the narrative, including the five
  defects found by deliberately breaking things). Note it also commits the
  `nextjs-agent-rules` block `next dev` appends to `CLAUDE.md` on every run —
  that block is tool-generated and self-restoring, so committing it is what
  keeps `git status` clean. This very edit is a docs-only follow-up on top,
  made after confirming the push succeeded.
  Before that, `f23012b` — "Phase 22: SEO, social sharing, structured
  data, and a semantic HTML audit," pushed to `origin/develop` (37 files —
  `git show f23012b --stat` for the full list; the commit message carries
  the full reasoning, and this file's Phase 22 log entry below carries the
  narrative, including what could *not* be verified and why). This very
  edit — recording that hash here — is a small docs-only follow-up on top
  of it, made after confirming the push succeeded, so expect `git log
  --oneline` to show one commit above `f23012b` that touched nothing but
  `docs/progress.md`.
  Before that, `8b9d2f6` — "Phases 20-21: Projects admin module and
  the complete admin panel," pushed to `origin/develop` (74 files —
  `git show 8b9d2f6 --stat` for the full list; the commit message carries
  the full reasoning, including why both phases landed as *one* commit:
  Phase 21 edited several Phase 20 files in place, so a "Phase 20 only"
  commit would not have compiled — the same situation `56b789a` handled the
  same way). **The actual tip of `origin/develop` is `dc3479a`**, a
  docs-only follow-up recording that hash here (plus a second docs-only
  commit updating this section's environment state at the very end of the
  Phase 21 session — if `git log` shows one more commit than expected on
  top of `dc3479a`, that's it, and `git show` will confirm it touched
  nothing but `docs/progress.md`).
  Before that, `959e204` — "Phase 19: Profile, Skills, and
  Experience admin modules," pushed to `origin/develop` (37 files —
  `git show 959e204 --stat` for the full list; full reasoning in the
  commit message and this file's own Phase 19 log entry below). Before
  that, `56b789a` — "Phases 7-18: full public site, admin auth/shell, and
  shared admin infrastructure" (148 files, squashing everything built
  since `72f3b5a`/Phase 6 into one commit since it had all been sitting
  uncommitted across many sessions — `git show 56b789a --stat` for that
  file list), followed by `6105110`, a docs-only follow-up recording that
  hash in this file. `docs/progress.md` and `CLAUDE.md` were already
  tracked as of `6b0b2f5` ("Add docs/progress.md as a cross-session build
  log," Phase 6-era, one commit before `72f3b5a` in history despite the
  name — it's a docs-only commit layered on top). This very edit
  (recording the `959e204` hash above) is itself a small follow-up
  commit on top of `959e204`, made *after* confirming the push
  succeeded — expect `git log --oneline` to show it as the tip. If
  `git status` isn't clean when a new session checks, something changed
  since this was written; read the diff before assuming it's safe to
  touch. Note: Phase 17
  moved `app/projects/`, `app/styleguide/`, `app/resume/`, and `app/page.tsx`
  into a new `app/(site)/` route group (see that phase's log entry for why)
  — `git status` shows the previously-tracked `app/styleguide/*` files as
  deleted and the `(site)` copies as new/untracked rather than a detected
  rename, since they were moved with plain `mv`, not `git mv`; functionally
  identical, just not recorded as a rename in the diff.
- **Local Supabase stack: running as of the end of the session that wrote
  this update**, and — new as of Phase 20 — running **with `storage-api`
  included**, not the historically-minimal Postgres+PostgREST+Auth+Kong
  set. Real file uploads (project logos, cover images, gallery items) need
  a real Storage backend to hit, which the project's long-standing minimal
  `--exclude` flag set (documented below and in `supabase/README.md`)
  deliberately excludes — Phase 20 was the first phase whose own admin
  module actually needed to exercise uploads against a real backend to
  verify itself (Education/Experience/Profile's `ImageUploader` usage in
  Phases 18–19 was built and reviewed but never actually proven against a
  live Storage service either, for the same reason). Docker Desktop isn't
  always already running when a session starts — launch it and wait for
  `docker info` to succeed first; see "To stand up the local stack on a
  fresh machine/session" below, now updated to include `storage-api`.
  Once it's up, the containers are `supabase_db_syed-asif-portfolio`,
  `supabase_rest_syed-asif-portfolio`, `supabase_auth_syed-asif-portfolio`,
  `supabase_kong_syed-asif-portfolio`, and (as of Phase 20)
  `supabase_storage_syed-asif-portfolio`. **All five were verified up and
  healthy at the end of the Phase 21 session**, along with three other
  things a new session would otherwise have to re-derive: the database
  holds exactly `supabase/seed.sql`'s content (**re-verified row-for-row at
  the end of Phase 21** — one row in each of all 15 tables, and **zero rows
  in `storage.objects`**), `.env.local`'s anon key still authenticates
  against the running stack (confirmed with a real PostgREST request →
  HTTP 200, so the JWT signing material was *not* regenerated by Phase 21's
  `db reset`), and `public.set_active_resume` exists in `pg_proc` (i.e.
  Phase 21's migrations really are applied, not just present on disk).
  There is also one **local test admin
  account** (`test-admin@example.com`
  / `Test-Admin-Pass-123!` — a real Supabase Auth user with a row in
  `private.admins`, local-only, not a secret worth protecting since it's a
  throwaway Docker Postgres instance). **It was destroyed and recreated
  during Phase 21**: `npx supabase db reset` (needed to apply the two new
  migrations) wipes `auth.users` and `private.admins` along with the
  content tables. Recreating it is two steps, both fast — `POST
  {SUPABASE_URL}/auth/v1/admin/users` with the service-role key as *both*
  `apikey` and `Authorization: Bearer` (body `{"email":...,"password":...,
  "email_confirm":true}`), then a `docker exec ... psql` insert into
  `private.admins` selecting that user's id. Verified present again at the
  end of Phase 21 (1 row in `auth.users`, 1 in `private.admins`). Kept, not
  cleaned up, since a future
  session building the actual content editors will want a working admin
  login to test against without re-deriving this) — assuming Docker's
  volumes survived whatever stopped the engine; if `docker ps -a` shows no
  Supabase containers at all after starting Docker Desktop back up, a full
  `npx supabase start` + `npx supabase db reset` is needed instead of just
  waiting for existing containers to resume, and the admin account will
  need re-creating per Phase 17's log entry. Every phase's *content* test
  rows (extra projects, experience entries, skills, etc.) were inserted
  live for verification and then removed again, never left behind.
  `.env.local` exists and is correctly configured (real, working
  anon/service_role keys — **regenerated during Phase 17**, see that
  phase's log entry and the JWT note below — old keys copied from before
  Phase 17 will no longer work) — but re-verify against `npx supabase
  status -o env` if the stack needed a fresh `start` rather than just
  resuming, since that regenerates the JWT signing material.
- **Next.js dev server:** tied to this tool session's process management
  (started via the `portfolio-dev` launch config), so a brand new chat
  session likely needs to start it again — `preview_start` with `{"name":
  "portfolio-dev"}`. If anything looks stale after starting it, `rm -rf
  .next` first (see the Turbopack cache notes below).
- **No live *hosted* Supabase project exists yet**, but as of Phase 7 the
  layout shell is built against a genuinely running **local** stack rather
  than mocks — `.env.local` now exists on this machine (gitignored, not
  committed; only `.env.example` is). Provisioning a real hosted project,
  running the migrations against it, and creating the *real* admin account
  (documented in [docs/deployment.md](./deployment.md#admin-account) — a
  different thing from Phase 17's local-only test account above) is still
  outstanding — needed before the site can actually go live, but not
  before further phases can continue.
- **To stand up the local stack on a fresh machine/session:** Docker
  Desktop must actually be *running* first (`docker info` — if it fails,
  launch `Docker Desktop.exe` and wait; it's not always already up even
  though it's installed). Then `npx supabase start --exclude
  studio,logflare,vector,imgproxy,edge-runtime,mailpit,supavisor,realtime,postgres-meta`
  (note: **Auth/gotrue and `storage-api` are now both included**, unlike
  the flag set Phases 1–16 used — Auth was added in Phase 17, `storage-api`
  in Phase 20 specifically to verify real file uploads live; see
  [supabase/README.md](../supabase/README.md), which still documents the
  *original* fully-minimal flag set as a fallback if `storage-api` proves
  too resource-heavy/flaky on a given machine — Projects' admin module is
  the only thing that currently needs it) and `npx supabase db reset`.
  **Do not hand-type a "well-known local demo" anon/service_role JWT from
  memory** — the fixed pair some docs/tutorials quote does not match this
  CLI version's actual local `jwt_secret` and fails with `PGRST301 "None
  of the keys was able to decode the JWT"` in a way that's easy to
  misdiagnose as an RLS problem. Get the real values straight from the CLI
  instead: `npx supabase status -o env` after `start` prints the current,
  definitely-correct `ANON_KEY`/`SERVICE_ROLE_KEY` for whatever's actually
  running — trust that output over anything previously saved in
  `.env.local`. **This *can* regenerate the JWT signing material** (it did
  in Phase 17, when `stop`+`start` was needed to add a service for the
  first time) **but doesn't always** — Phase 20's `stop`+`start` cycle
  (adding `storage-api`) restored from Docker's own backup and kept the
  exact same keys already in `.env.local`, confirmed via `npx supabase
  status -o env` rather than assumed either way. Always re-verify after a
  `stop`/`start` cycle; never assume which outcome you got.
- **Environment notes specific to this machine:** Windows, PowerShell is
  the working shell (Bash tool exists but has PATH/quoting quirks — prefer
  PowerShell for npm/node commands). Node.js and Docker Desktop were not
  preinstalled and were set up during Phase 1/2 (Node via `winget`, Docker
  was already present). `npx supabase start` works but the full stack
  (`storage-api`, `studio`, `logflare`/analytics) is flaky/resource-heavy
  locally — see [supabase/README.md](../supabase/README.md) for the minimal
  `--exclude` flag set that reliably starts Postgres + PostgREST + Auth +
  Kong, which is all `lib/data` and Phase 17's auth flow need.

## Phase log

**Phase 1 — scaffold.** Next.js App Router + TypeScript strict + Tailwind
v4, npm, no `src/`. Replaced a pre-existing static HTML/CSS/JS portfolio
site (preserved in git history before removal — see commits before
`c859f71` if that content is ever needed again). Dark-mode-only from the
start. `main` branch created, `develop` branched off it — all subsequent
phases target `develop`.

**Phase 2 — content schema.** Full Postgres schema as one migration
(`supabase/migrations/20260816102304_create_content_schema.sql`): 15
tables, enums, an `updated_at` trigger, a `slugify()` helper, indexes,
`supabase/seed.sql` with one realistic row per table. Full reference:
[docs/database.md](./database.md).

**Phase 3 — RLS, storage, security.** A second migration
(`20260816103908_rls_and_storage.sql`) enabling RLS on every table, an
`is_admin()` allowlist-based helper (`private.admins`, not a JWT claim —
rationale in [docs/architecture.md](./architecture.md#what-admin-means)),
8 storage buckets with matching policies, and `lib/supabase/{client,server,admin}.ts`.
**Two real bugs were found and fixed directly in this migration file**
during Phase 4's verification against a genuine local Supabase stack (not
just the hand-rolled test harness that had been masking them): (1)
`storage.objects` RLS can't be altered by the migration role on real
Supabase — wrapped in a `do` block catching `insufficient_privilege`; (2)
new tables are **not** auto-granted to `anon`/`authenticated` the way the
original Phase 3 docs assumed — explicit `GRANT`s were added. Both fixes
landed in the original migration (never edited after the fact once
verified) since neither bug had ever reached a real environment. Full
writeup: [docs/architecture.md](./architecture.md#the-rls-model).

**Phase 4 — typed data access layer.** `types/database.ts` (generated,
never hand-edited) → `types/content.ts` (hand-authored domain types,
what everything else imports) → `lib/validation/` (Zod, mirrors
`content.ts`) → `lib/data/` (one module per entity, `fetchX` raw query +
`getX` = `fetchX` wrapped in `unstable_cache`). Caching strategy: tag-based
(`lib/constants.ts`'s `CACHE_TAGS`) + 1hr fallback revalidate, documented in
[docs/architecture.md](./architecture.md#caching-strategy). Key gotcha:
`unstable_cache` throws outside a real Next.js server runtime, which is why
`fetchX` (unwrapped) exists separately and is what
[`tests/lib/data/smoke.ts`](../tests/lib/data/smoke.ts) calls — run it with
`npm run smoke:data` against a running local Supabase stack to sanity-check
the whole data layer end-to-end.

**Phase 5 — design system.** `styles/tokens.css` (colour/type/spacing/
radius/shadow/motion tokens, extracted from UI reference images — dark
navy + chartreuse accent + soft colour glows), wired into Tailwind v4 via
`@theme inline` in `styles/globals.css` (**no `tailwind.config.ts`** — v4
is CSS-first, see [docs/architecture.md](./architecture.md#why-css-tokens-not-tailwindconfigts)
for why adding one would be dead weight). Sora + Inter via `next/font`.
`lib/motion.ts` (reusable Framer Motion variants) +
`components/motion/MotionProvider.tsx` (wraps `MotionConfig
reducedMotion="user"` — reduced-motion is automatic everywhere, no
per-section handling). `/styleguide` route created as the ongoing visual
QA tool (noindex, 404s on `VERCEL_ENV=production`, visible in dev/preview).

**Phase 6 — UI primitives.** Everything in `components/ui/` that Phases
7+ must compose rather than reinvent: `Button`, `IconButton`, `Card`,
`Section`/`Container`/`SectionHeading`, `Badge`/`Tag`, `Divider`, `Avatar`,
`EmptyState`, `Skeleton`. shadcn/ui installed into `components/admin/ui/`
(**deliberately not `components/ui/`** — prevents any collision with or
visual contamination of the hand-built public-site primitives; admin/
overlay use only, per CLAUDE.md), themed via a compatibility block in
`globals.css`'s `@theme` that aliases shadcn's expected variables onto
existing tokens (nothing new). **Two more real bugs caught by actually
building out `/styleguide`'s Primitives section**: Radix `Slot` rejecting
`Button`'s icon+children combo under `asChild` (fixed with `Slottable`),
and tailwind-merge silently dropping `text-accent-foreground` because it
didn't know our custom `text-h2`/`text-body`/etc. font-size scale is a
different utility group than text-color classes — fixed by extending
`cn()`'s tailwind-merge config in `lib/utils.ts`. Also added
`@custom-variant dark` (was missing entirely — without it, shadcn's
`dark:` utilities would have silently followed OS preference instead of
this permanently-dark site's `.dark` class) and dropped an unnecessary
`next-themes` dependency shadcn's installer pulled in.

**Phase 7 — layout shell.** `components/layout/Navbar.tsx`,
`Footer.tsx`, `PageTransition.tsx`, wired into `app/layout.tsx` alongside a
skip-to-content link, and a placeholder `app/page.tsx` rendering empty
`Section`s for every homepage anchor (hero through contact) so the shell
could be proven before any real content exists. Nav items are fully
data-driven (`site_settings.primary_nav`, typed fallback to
`DEFAULT_NAV_ITEMS`) — adding a nav item is a database row, not a code
change, per CLAUDE.md's core principle. New hooks:
`hooks/useActiveSection.ts` (IntersectionObserver scrollspy, ids derived
from whatever hash-anchor `navItems` it's given — no hardcoded section
list), `hooks/useFocusTrap.ts` + `hooks/useLockBodyScroll.ts` (mobile nav
overlay: Tab-cycling trap, Escape/backdrop/route-change close, body scroll
lock). Anchor scrolling is offset for the fixed header **without any JS
scroll math**: a new `--header-height` token
([styles/tokens.css](../styles/tokens.css)) plus
`scroll-mt-(--header-height)` added to the shared `Section` primitive
([components/ui/Section.tsx](../components/ui/Section.tsx)) and a
reduced-motion-aware `scroll-behavior: smooth` in
[styles/globals.css](../styles/globals.css) — every current and future
section gets correct offset/smooth scrolling for free. A shared
`resolveAnchorHref()` ([lib/utils.ts](../lib/utils.ts)) makes both Navbar
and Footer links resolve `#about` → `/#about` off the homepage, so nav
anchors still work from a future project detail page instead of doing
nothing. **Two more real primitive/tooling gaps surfaced by first real
usage** (same pattern as Phase 6): `IconButton`'s `asChild` never actually
worked — it didn't use `Slottable` the way `Button` does, so a
caller-supplied wrapping element (needed for the footer's icon-only social
links) was silently discarded; fixed in
[components/ui/IconButton.tsx](../components/ui/IconButton.tsx) to mirror
`Button`'s pattern exactly. And the pinned `lucide-react` version ships no
brand/logo icons at all (`Github`/`Linkedin`/`Twitter` etc. don't exist in
this package) — contact-link icons are generic Lucide icons keyed by
`contact_type` instead (`Mail`/`Briefcase`/`FolderGit2`/`MessageCircle`/
`Share2`/`Link2`), not the row's own freeform `icon` string. Also hit (and
fixed by adjusting state during render instead of in an effect, per React's
own guidance) `eslint-plugin-react-hooks`'s `set-state-in-effect` rule
flagging the common "close mobile menu on route change" pattern.

**Phase 8 — hero section.** `components/sections/Hero.tsx`: the first real
(non-placeholder) section, and the pattern later sections should follow —
an `async` Server Component that calls `getProfile()`/`getActiveResume()`
itself (see the updated
[components/sections/README.md](../components/sections/README.md):
sections fetch their own data now, co-located rather than prop-drilled from
`app/page.tsx`; layout components are still the exception since their data
is shared across every route). Two small `"use client"` children carry the
actual animation: `HeroReveal.tsx` (staggered reveal of eyebrow/name/
headline/availability badge/tagline/bio/CTAs via lib/motion.ts's existing
`staggerContainer`/`staggerItem` — nothing new added there) and
`HeroBackground.tsx` (three large blurred, low-opacity, corner-positioned
color-wash blobs drifting via `transform`-only Framer animation; capped to
one blob on mobile via responsive `hidden`/`block`, paused via `useInView`
the moment the hero scrolls out of the viewport, and reduced-motion-safe
for free via `MotionProvider`). Every content field is independently
optional and conditionally rendered — verified by actually nulling out
`headline`/`tagline`/`short_bio`/`availability_status` (and even
`current_role`) directly in the local Postgres database mid-session and
confirming the hero degrades to just the eyebrow + name + CTAs without any
broken gaps, rather than trusting that "should" work from reading the code.
`profile.headline` falls back to `profile.current_role` before falling all
the way back to nothing. The single `<h1>` is the name only — no other
heading tags anywhere in the section. New `--hero-min-height: calc(100vh -
var(--header-height))` token, applied only at `lg:` and up
(`lg:min-h-(--hero-min-height)` on Hero's `Container`); below `lg` the hero
sizes to its content instead, specifically so mobile never risks pushing
the CTAs below the fold. **Mobile fit needed one real correction, not just
a hunch**: at a literal 360×640 viewport the initial `py-20`/`gap-4` padding
pushed the CTA row 38px past the fold — caught by actually measuring
`getBoundingClientRect()` against `window.innerHeight`, fixed by dropping to
`py-8`/`gap-3` below `sm:`, re-verified at 34px of clearance afterward.
Skipped a literal portrait/photo despite the reference images showing one:
`profile.avatar_url` exists in the schema but no asset pipeline or actual
image exists yet in this project, and the phase's own CONTENT list didn't
call for one — treated the references as tone/rhythm inspiration, not a
literal spec, given they're also a different color palette than this
site's tokens.

**Phase 9 — about section.** `components/sections/About.tsx`: unlike Hero,
this one *does* reuse `Section`/`SectionHeading` normally — About has no
full-bleed background layer, so there's no reason to hand-roll the outer
wrapper the way Hero had to. Two children: `AboutContent.tsx` (client —
`staggerContainer` + `revealOnScroll` together on one grid, portrait and
text as the two `staggerItem`s: the combo requirement 5 asked for, no
change to lib/motion.ts needed) and `AboutPortrait.tsx` (client — a large
square portrait, deliberately *not* `components/ui/Avatar`: Avatar is a
small circular identity marker that always renders `unoptimized`, whereas
this needs real `next/image` with a proper `sizes` attribute at a much
bigger size, so it's its own component with its own initials-fallback
tile). Empty-content handling is layered, matching the two different
"empty" cases the brief called out: `About.tsx` (server) hides the *entire*
section when every About-relevant profile field is empty (verified for
real — nulled every field directly in Postgres mid-session and confirmed
the section vanishes from the DOM, not just "should" per the code);
`AboutContent.tsx` renders `EmptyState` in the bio's place specifically
when only `long_bio` is empty but other fields (avatar, location, ...)
still exist, so those don't get hidden along with it. `profile.headline`
doubles as the "focus area" quick-fact — the schema has no dedicated
`focus_area` field, and headline already reads as one; flagged this
interpretation call rather than silently picking it. **Requirement 6 ("no
layout assumption may depend on bio length") was verified, not assumed**:
swapped `long_bio` between a ~40-word and the real ~220-word version
directly in the database and measured the rendered DOM both times — the
grid's `items-start` alignment keeps the portrait a fixed aspect-square
regardless of how tall the text column gets, confirmed by comparing
`getBoundingClientRect()` width vs. height on the portrait in both cases.
The placeholder `long_bio` itself (three paragraphs: background/education,
technical interests, career direction) lives in
[supabase/seed.sql](../supabase/seed.sql) — not hard-coded in any
component — and paragraphs are split server-side on blank lines
(`splitParagraphs()` in [lib/utils.ts](../lib/utils.ts)) into plain `<p>`
children, never `dangerouslySetInnerHTML`, so the "don't accept raw HTML"
requirement is structural rather than something to remember to enforce.

**Phase 10 — skills section.** `components/sections/Skills.tsx` (server —
`getSkillCategoriesWithSkills()`) + `SkillsContent.tsx` (client — the
category grid, chips, and both stagger levels). No per-skill icons: the
brief explicitly wants "consistent typographic chips, not a grid of
mismatched brand logos," and this project's `lucide-react` version ships no
brand marks anyway (same fact Footer's contact icons ran into in Phase 7),
so a plain text chip is the one treatment guaranteed to look uniform
whether a category has 1 skill or 20 — verified both counts side by side
with real inserted test rows, not just reasoned about. Category icons *do*
resolve (a small curated kebab-case-slug → Lucide-component map, same
pattern as Footer's `CONTACT_ICON_BY_TYPE`), with an unrecognized slug
falling back to a generic icon rather than silently showing nothing, since
the admin explicitly asked for one. **Two-level stagger without touching
lib/motion.ts**: categories stagger via the unmodified `staggerContainer`
on the outer grid; each category's own skill list is a *nested*
`staggerContainer` that inherits its "visible" state from the outer
cascade (ordinary Framer variant propagation — no separate viewport
trigger needed on the inner list) but gets a per-instance `transition`
override (`staggerChildren` scaled down as `skills.length` grows) so a
20-skill category finishes cascading in well under a second instead of
stacking 20× the default per-item delay. Hit a real
`react-hooks/static-components` lint error resolving category icons
(`const Icon = lookup(); return <Icon/>` reads to the React Compiler rule
like a component being defined during render, even though every value in
the lookup table is a stable, module-level reference) — fixed by turning
the icon resolution into a plain function that *returns* the finished
`<span><Icon/></span>` tree (`renderCategoryIcon()`, called as
`{renderCategoryIcon(...)}`) instead of exposing a capitalized variable to
JSX tag position; worth recognizing on sight next time a "look up a
component from a map" pattern shows up; a `useMemo` wrapper does **not**
satisfy this rule, only restructuring away from the `<Var/>` shape does.
Verified the zero-published-skills-category-must-not-render and
1-vs-20-skill-balance requirements with real data: inserted four extra
test categories/skills directly into Postgres (one unpublished-only
category, one 20-skill category, mixed-proficiency rows) via `psql` piped
through `docker exec` — `supabase db query` chokes on multi-statement
scripts ("cannot insert multiple commands into a prepared statement"), so
multi-statement test seeding goes through `docker exec -i
supabase_db_<project> psql -U postgres -d postgres < file.sql` instead —
then reset the database back to the real single-category seed row
afterward with `supabase db reset`.

**Phase 11 — experience & education.** Two sections sharing a visual
language but built as separate component trees:
`components/sections/Experience.tsx` (server → `ExperienceContent.tsx`,
client, the timeline rail → `ExperienceItem.tsx`, the card content, server
so its text is in the initial HTML) and the same three-file shape for
Education, minus the rail. **The timeline connector never needs "first/last
item" special-casing** because of how it's built: each `<li>` only ever
draws the line *below* its own dot (via a flex sibling with `flex-1` that
stretches to match however tall that row's card turns out to be — no
absolute positioning, no height measurement), and the last item simply
skips rendering that line. There's structurally no way for a stub to hang
off either end, which is why the 1-entry and 9-entry cases (tested live,
not just reasoned about — see below) both render correctly with zero
conditional logic aimed specifically at "is this the first/last one".
**Alternating left/right on desktop, single column on mobile** is two
separate DOM structures in the same `<li>` behind `md:hidden` /
`hidden md:flex` — the same pattern Navbar's mobile-menu-vs-desktop-nav
already uses in this codebase, chosen over CSS-order tricks because a
truly centered rail with content alternating sides needs a 3-slot
layout, and duplicating the (stateless) card render was simpler and more
robust than fighting `order`/`grid` arbitrary-value temptations to avoid
it. Descriptions render at **full length, never clamped** — a deliberate
choice (the brief offered clamp-with-expand as the alternative): the
rail already handles arbitrary card height for free, so clamping would
only add interactive state with nothing to gain, and *two* DOM copies of
that state (mobile/desktop) would need to stay in sync for no reason.
**Duration math was verified with a throwaway `tsx` script before it ever
touched a component** — `formatDuration()`
([lib/utils.ts](../lib/utils.ts)) counts elapsed months as a plain
non-inclusive difference (Jan 2022 → Jan 2023 reads as a clean "1 yr", not
"1 yr 1 mo") floored at 1 month, which is what makes a same-month
start/end read as "1 mo" instead of "0 mos" — the one case the brief
explicitly called out. Date parsing splits the "YYYY-MM-DD" string
directly rather than going through `new Date(...)`, avoiding the classic
timezone off-by-one where UTC midnight reads back as the previous local
day. **Verified the longevity requirement with real inserted data, not
just design reasoning**: 9 experience entries (mixed field completeness —
some with no logo/location/description/responsibilities/technologies at
all) and 3 education entries, inserted via the same `docker exec ... psql`
route Phase 10 established, confirmed the alternating parity holds for
all 9, the rail has no stub at either end, mobile collapses every card to
the same left edge, and a same-month entry prints "1 mo" — then reset back
to the real single-entry seed rows afterward.

**Phase 12 — projects (the most important section).** New
`components/sections/projects/` subfolder — the first section built as a
folder rather than a flat file, because `ProjectCard`/`ProjectGrid` are
shared by *two* callers, not one: the homepage's `Projects.tsx` (featured,
capped, with a "View all" link) and the new `/projects` index page
(everything, unfiltered). Real data-layer gaps had to be fixed before any
UI work, not routed around: `Project` (the lean list type `getProjects()`
returns) had no `technologies` field at all — only the single-project
detail fetch did — so a card couldn't show "top 3–4 technologies" without
one. Fixed by embedding `project_technologies` in
`fetchProjects()`'s existing query
([lib/data/projects.ts](../lib/data/projects.ts), same embedded-select
pattern `fetchProjectBySlug` already used) rather than adding a second
per-card query. **The "pure function in lib/" the brief asked for
(`selectProjects()` in [lib/projects.ts](../lib/projects.ts)) is the
actual, only place "featured first, then display_order" sorting happens**
— `getProjects()` itself doesn't sort that way, so this isn't a
redundant/decorative wrapper, `ProjectGrid`'s `featuredOnly`/`limit` props
route through it for real, and `category`/`query` are already part of its
signature (accepted, unused) so a future filter UI is an implementation
inside this one function, not a signature change rippling through every
caller. **Reused `Card`'s `interactive href` mode for the whole-card link
requirement** (one `<a>`, nothing nested inside — Card's own doc comment
already warned about this) rather than hand-rolling it, and gave it an
explicit `aria-label={project.name}` so the accessible name is just the
project name, not the image alt text + description + every tech tag
concatenated. **`Card` itself had a real gap for this phase's "keyboard-
reachable, not hover-only" requirement**: its `whileHover` (Framer) had no
`whileFocus` counterpart, so the lift/glow animation was mouse-only —
fixed by mirroring `whileHover` onto `whileFocus`
([components/ui/Card.tsx](../components/ui/Card.tsx)), which now benefits
every current and future interactive `Card`, not just project cards;
verified by calling `.focus()` on a card and confirming the same
`translateY(-6px)` transform applied as hover does. Missing/broken logos
fall back to a centered-initials tile (same pattern as `AboutPortrait`
from Phase 9) — deliberately *not* `components/ui/Avatar`, same reasoning
as `AboutPortrait`: this needs real `next/image` with `sizes` and a
loading skeleton, at a size Avatar was never meant for. **Verified the
requirements that actually matter at scale with real inserted data**: 11
published projects (one unpublished, correctly excluded) including one
with 5 technologies (correctly capped to 4 on the card) and three
featured (correctly sorted to the front as a group, correctly ringed +
badged); flipped `featured` off entirely to confirm the homepage section
falls back to the first N by `display_order`; flipped `published` off
entirely to confirm the homepage section hides while `/projects` shows
`EmptyState` instead of an empty grid — two different empty-handling
behaviors for two different callers, both correct. A minimal
`/projects/[slug]` placeholder page exists so `ProjectCard` doesn't link
to a 404 (`notFound()` still fires for a genuinely invalid slug) — the
real case-study layout (problem/solution/features/media) is explicitly
out of scope here and left for a later phase.

**Phase 13 — the real project detail page.** Replaced Phase 12's
placeholder `app/projects/[slug]/page.tsx` with the full case-study
layout. **The "no redeploy" requirement is a route-config detail, not a
new caching mechanism** — `generateStaticParams()` pre-renders known
slugs, `dynamicParams` is simply left at its Next.js default (`true`,
never overridden) so an unknown-at-build slug still renders on demand
instead of 404ing, and `export const revalidate = 3600` on the page keeps
already-pre-rendered pages from being static forever. Full reasoning
(and how it composes with `lib/data`'s existing tag-based invalidation
for a future admin panel) is written up in
[docs/architecture.md](../docs/architecture.md)'s new "Per-route
revalidation" section, per the brief's explicit ask to document it
there. **Verified the exact mechanism, not just the code path**: inserted
a brand-new project row directly in Postgres mid-session and loaded its
page with zero server restart — it rendered immediately, because
`getProjectBySlug("that-new-slug")` had never been cached before (first
call, not stale). Its *absence* from the `/projects` grid's prev/next
computation until the cache actually cleared was equally instructive and
is now called out explicitly in the architecture doc — `getProjects()`
(the list) was already cached from earlier in the session with the old
count, so a brand-new slug being instantly reachable directly and a
brand-new slug being instantly *listed* are two different guarantees, not
one. Extracted `formatOptionalDateRange()` into
[lib/utils.ts](../lib/utils.ts) (generalizing what `EducationItem` had
private and duplicated, since projects need the identical
both-dates-optional branching with different label text) rather than
writing a third copy. Reused `ProjectCardImage` for the header logo
instead of building a second logo-with-fallback component — added
`className`/`sizes`/`priority` overrides so the same component serves
both the grid's full-width square and the header's small fixed one.
Fixed a real, previously-unnoticed gap while wiring up canonical URLs:
no route anywhere had ever set `metadataBase`, so `next dev` had been
silently warning and falling back to `http://localhost:3000` for every
Open Graph image since Phase 8 — now set once on the root layout from
`NEXT_PUBLIC_SITE_URL`, letting every route's `generateMetadata` use
relative canonical/OG URLs instead of each one string-concatenating an
origin by hand. **Verified requirement 4 (a minimal name+description-only
project must look deliberate) with a real inserted row, not just
design reasoning**: it rendered a logo-initials tile, the name, a status
badge (status always has a DB default, never actually null), an Overview
section carrying the description, and full footer navigation — with
every other block (short description, dates, GitHub/demo buttons,
problem/solution/purpose, technologies, features) correctly absent
rather than rendered empty. `app/projects/not-found.tsx` (route-segment,
not the root 404) returns a genuine HTTP 404 — confirmed with `curl -o
/dev/null -w "%{http_code}"`, not just eyeballing the rendered page.

**Phase 14 — project media gallery and lightbox.** Filled in
`components/sections/projects/ProjectMediaGallery.tsx` (previously a
deliberate no-op stub — see Phase 13's log entry) without touching the
detail page around it, exactly as that stub's own comment promised. Split
into the same small-file pattern every other multi-piece section already
uses: `ProjectMediaGallery.tsx` (Server Component, renders nothing for zero
media rows, otherwise the "Gallery" heading + client `MediaGallery`),
`MediaGallery.tsx` (client — owns grid + lightbox state, keyboard nav, and
the two hooks), `MediaThumbnail.tsx` (one grid cell, three render paths),
`MediaLightbox.tsx` (the dialog). New pure-function file `lib/media.ts`
(`isViewableMedia`, `resolveMediaLabel`) — same "pure function in lib/"
precedent Phase 12 set with `lib/projects.ts`.

**The accessible-dialog requirements were built by reusing, not
reinventing, Phase 7's Navbar mobile-nav pattern**: `useFocusTrap` +
`useLockBodyScroll` are called in `MediaGallery` (the state owner) with a
ref forwarded down to `MediaLightbox`'s root dialog node — identical split
to how Navbar drives its mobile overlay. This gets focus-moves-in,
Tab-trapping, and **focus returning to the exact thumbnail that opened
it** for free from the existing hook, verified live: opened the dialog via
a real click, pressed Escape, and confirmed `document.activeElement` was
back on that same thumbnail `<button>`, not just "should be" per the code.

**Real gaps found and fixed, not routed around** (same pattern as every
earlier phase's real-bug catches):
- `next.config.ts` had never configured `images.remotePatterns` —
  `Avatar.tsx` and `AboutPortrait.tsx` had already independently flagged
  this exact gap in their own comments and worked around it
  (`unoptimized`/same-origin-only) rather than fixing it, since nothing
  before this phase needed real optimization of a remote asset. Fixed for
  real this time (scoped to Storage's public-object path, derived from
  `NEXT_PUBLIC_SUPABASE_URL` at config-eval time) since "thumbnails are
  small optimized derivatives, full images load on demand" is meaningless
  without it — Requirement 4 doesn't work at all against a genuine remote
  Supabase Storage URL otherwise. `Avatar`/`AboutPortrait` themselves
  weren't touched (out of this phase's scope), but the gap they both
  flagged no longer exists for anything new.
- **GIFs bypass next/image entirely** (a plain `<img>`, both thumbnail and
  lightbox) — Next's image optimizer would otherwise flatten the animation
  to a single frame. This is a real constraint, not caution: verified the
  rendered thumbnail's `<img src>` was the raw `file_url`, never a
  `/_next/image?...` proxy URL.
- **`project_media` has no poster/thumbnail field for video** (only
  `file_url`, `storage_path`, `media_type`, `title`, `alt_text`, `caption`,
  `display_order` — confirmed against the actual schema, not assumed).
  Rather than add a migration unprompted (CLAUDE.md's "don't scaffold
  ahead of phase"), video thumbnails/lightbox use `preload="metadata"`,
  which gets a browser-decoded first frame for free without one. Flagging
  this here rather than silently treating it as equivalent to a curated
  poster image — a future phase adding a real `poster_url` column would be
  a legitimate follow-up, not scope creep on this one.

**Alt-text fallback and the single-item grid requirement were both proven
with real inserted data, not just design reasoning** — 20 test
`project_media` rows spanning all five `media_type`s (mixed alt_text/title
completeness, all pointing at genuinely nonexistent files, same trick
Phase 8/9 used for their own broken-image fallback tests) inserted via the
established `docker exec ... psql` route, then removed again afterward.
Confirmed: `resolveMediaLabel`'s alt_text → title → generated-label chain
produced correct, non-empty labels for every combination; the lightbox's
position indicator correctly counted only the 19 *viewable* items (the
20th was the document row, excluded by design since it's a download link,
never lightbox content); Left/Right/Home/End all moved the correct
direction; a dispatched synthetic `error` event on a thumbnail's `<img>`
swapped it for the `ImageOff` placeholder, never a broken-image icon. The
1-item grid case didn't need special-casing to verify separately: a plain
CSS grid item with no explicit column-span structurally cannot stretch
past its own track, which is what makes "1, 3, or 20 items never looks
broken" true without any item-count branching in the component.

**Two environment-specific things worth recording for next time**: (1)
**another chat session's dev server was already running against this same
project directory**, and Next.js 16's own dev-server lock (keyed to the
project directory, not the port) refuses a second `next dev` instance
against it even with `autoPort`/a different port — the fix isn't a
different port, it's recognizing you don't need your own server at all
when one's already watching the same files: the other session's server
picks up saved edits via normal HMR, so pointing the Browser pane at its
existing origin works fine. (2) That server also already had this
project's detail page cached (`unstable_cache`, Phase 13's documented
gotcha) from *before* the test rows were inserted, and there's no admin
panel yet to call `revalidateTag` through — worked around by temporarily
adding a one-line `app/api/<name>/route.ts` calling
`revalidateTag(CACHE_TAGS.projects)`, hitting it once, then deleting the
route again immediately after (twice — once to see the test data, once
more after cleaning it back up, so the other session was never left
looking at stale phantom rows). **A route folder named with a leading
underscore (`__debug-revalidate`) 404s** — Next.js's App Router treats any
`_`-prefixed segment as a private, non-routable folder; had to rename it
without the leading underscore before it would actually match.

New reusable variant added to `lib/motion.ts`: `slideVariants` (a
`custom`-direction-aware enter/center/exit set for carousel-style
"advancing forward vs. going back" transitions) — the lightbox is its
first user, but it's written generically enough for a future carousel to
reuse rather than being lightbox-specific. New token in
`styles/tokens.css`: `--lightbox-media-max-height: min(70vh, 640px)`,
same "viewport-relative sizing gets a named token" precedent Phase 8 set
with `--hero-min-height`, not a raw `vh` arbitrary value in the component.

**Phase 15 — certifications and achievements.** Replaced two of
`app/page.tsx`'s three remaining placeholder `<Section>`s (Contact is still
a placeholder, deliberately — out of this phase's DATA list) with real
sections, each following the established "Server Component fetches via
`lib/data`, returns `null` on zero rows, hands off to a small client child
for animation" shape every prior section uses.

**Certifications** (`Certifications.tsx` → `CertificationGrid.tsx` →
`CertificationCard.tsx`) deliberately borrows from *two* existing families
at once, since the brief asked for both at the same time: ProjectGrid's
exact grid/stagger/hover-lift treatment (so it visually belongs next to
Projects), but ExperienceItem/EducationItem's Avatar-plus-text header
composition instead of ProjectCard's full-width cover image — an
organization logo is a small mark, not a hero screenshot, and gets the
same monogram-fallback `Avatar` those two already use. Not
`interactive`/whole-card-link like ProjectCard: a certification can carry
*two* genuine separate links (verify credential, view certificate), so it
stays a static `Card` with real anchors inside, same as
ExperienceItem/EducationItem's own optional link.

New pure-function file `lib/certifications.ts` (`resolveExpiryStatus`) —
same "pure function in lib/" precedent as `lib/projects.ts`/`lib/media.ts`.
**The "honest but not alarming" expired-state requirement became a Badge
variant choice, not new UI**: `success` (green, same as
`ProjectStatusBadge`'s "completed") for a future expiration, `neutral`
(plain gray, no red/danger) for a past one — reusing Badge's existing
variant scale rather than inventing a new visual treatment for "expired."
Date comparison is against *today's local calendar date* assembled from
`Date`'s getters, not `new Date().toISOString()`'s UTC string — same
timezone-off-by-one trap `lib/utils.ts`'s existing date helpers already
guard against, applied here for the first time to a comparison rather than
just formatting.

**Achievements** (`Achievements.tsx` → `AchievementsContent.tsx` →
`AchievementItem.tsx` + `AchievementThumbnail.tsx`) went with the compact-
list option the brief offered rather than a second card grid — mostly so
three sections in a row (Projects, Certifications, Achievements) don't all
read as the same "grid of cards" shape. `AchievementThumbnail.tsx` is a new
small dedicated image-with-fallback component (same contract as
`ProjectCardImage`/`AboutPortrait`: real image when `image_url` is set, a
centered icon tile — `Award`, not initials, since a monogram doesn't make
sense for an achievement title — when it's null or the load fails), kept
separate from `ProjectCardImage` rather than reused since it's sized and
composed differently (a small fixed square inside a horizontal list row,
not a card's full-width top image). `AchievementItem`'s meta row (org ·
date) had to be written generically rather than copying
`ExperienceItem`'s — Experience always has a guaranteed `start_date` to
anchor the dot-separator logic on, but both `organization` and `date` are
independently optional on `achievements`, so the separator is inserted
between whichever already-truthy values survive a filter, not hardcoded
around two fixed fields.

**Both sections' "hide entirely on zero published rows" requirement (not
just an empty heading) was verified live, not assumed** — temporarily set
`published = false` on every row in both tables (via the same `docker exec
... psql` route established in earlier phases) and confirmed via
`document.querySelectorAll('h2')` that both the "Certifications" and
"Achievements" headings were completely absent from the DOM, not merely
visually hidden, then restored `published = true` and confirmed both
reappeared with the original seed content intact. Also verified: the
expired/no-expiry/missing-credential-id/missing-both-links certification
combinations and the no-image/no-date/no-actions achievement combinations
all render exactly the fields they should and nothing else (via temporary
test rows, same insert-then-clean-up pattern Phase 10 established), and no
horizontal overflow at a real 360px viewport.

**Same shared-dev-server situation as Phase 14, same fix**: another chat's
`next dev` was already running against this project directory, so rather
than fighting Next's own single-instance-per-directory lock, the Browser
pane just pointed at that already-running origin directly (it picks up
saved edits via normal HMR). Cache-busting after inserting/removing test
rows used the identical throwaway-route trick Phase 14 documented
(`revalidateTag` behind a one-off `app/api/<name>/route.ts`, deleted
immediately after each use) — this time revalidating both
`CACHE_TAGS.certifications` and `CACHE_TAGS.achievements` together in one
route since both tables needed fresh data for the same verification pass.

**Phase 16 — contact section and resume download; the public site is
complete.** Two independent pieces of work, one shared decision point.

**Decision, per the brief's own explicit instruction to ask first**: no
contact form. Asked the user directly rather than defaulting silently;
they confirmed the brief's own stated default (channels + resume only, no
form/spam-protection/email-delivery scope).

**Contact** (`Contact.tsx` → `ContactContent.tsx`) reuses Card's
`interactive href` whole-card-link mode (like ProjectCard) for each
channel, not Footer's icon-only treatment — this is the site's primary
contact destination, so the label and raw value (email, phone, handle) are
both visible. New shared `lib/contactLinks.ts`
(`CONTACT_ICON_BY_TYPE`/`resolveContactIcon`/`resolveContactHref`/
`isExternalContactHref`) is the "one lookup object... sensible default
icon for unknown types" the brief asked for, literally — and **fixed a
real gap in Footer.tsx along the way**: Footer's own pre-existing
`contactHref()` only ever built a WhatsApp link from an explicit `url`
column value, never derived one from `value` the way the brief specifies
("WhatsApp renders as a wa.me link built from the stored value") — nothing
before this phase had ever exercised a WhatsApp row for real, so the gap
was latent. Fixed once in the shared module, which both Footer and Contact
now import, rather than fixing it only where the new phase happened to
touch. Email and WhatsApp are *unconditionally* derived from `value`
(mailto:/wa.me, digits-only for the latter) regardless of whatever the
row's own `url` happens to hold — every other type uses `url` as given, or
is skipped if unset. The copy-email control is a standalone button below
the channel grid, not nested inside the email card itself: nesting a
second interactive control inside an already-whole-card `<a>` would create
two focusable targets with an unclear boundary, the exact trap Card's own
doc comment warns about.

**New `components/ui/Toaster.tsx`** — a public-site-themed `sonner`
instance (CSS-variable-driven off our own `--color-*` tokens, not
Tailwind's `!important` overrides), deliberately a *separate* instance
from `components/admin/ui/sonner.tsx`: that one is shadcn-themed and
admin/overlay-only per CLAUDE.md ("never imported by components/ui or
sections/"), so reusing it directly would have crossed that boundary. Both
wrap the same underlying `sonner` dependency (already pinned in
package.json), not a second toast library. Mounted once in
`app/layout.tsx`.

**Resume download** (`app/resume/route.ts`) streams the active resume
through this one stable route — `lib/constants.ts`'s new `RESUME_ROUTE`
constant, which Hero, Footer (a genuinely new addition — Footer never had
a resume link before this phase), and Contact all point at instead of a
resume row's own `file_url` — with a forced `Content-Disposition:
attachment; filename="Syed-Asif-Resume.pdf"` so the public URL survives a
re-upload and the downloaded file always has a polished name regardless of
the underlying Storage object's own path. A relative `file_url` (the local
seed's shape) is resolved against `NEXT_PUBLIC_SITE_URL` before an
internal `fetch()`, so the same code path handles both a local relative
path and a real remote Storage URL uniformly. **A real, verified-live gap
in the original design**: `notFound()` called from inside a Route Handler
does *not* render the nearest `not-found.tsx` the way it does from a Page
or Server Component — confirmed with a direct `curl`, which showed a
`404` status with a **completely empty body**, not the friendly
`app/resume/not-found.tsx` originally written for this. Fixed by
redirecting to a real page instead — `app/resume/unavailable/page.tsx`,
reached via `redirect("/resume/unavailable")` — which trades a literal 404
status for an actual React-rendered, on-brand page (full site chrome,
`EmptyState`, a "Contact instead" way out), a trade-off documented
directly in both files' comments. The original route-segment
`not-found.tsx` was deleted rather than kept alongside as dead weight,
since it was never actually reachable via the real failure path. The
single download-count TODO the brief asked for lives directly in the
route's success branch, right after the active-resume check — the one
place every real download (as opposed to someone finding a raw Storage
URL some other way) passes through.

**The shared dev server from Phase 14/15 was actually broken this time,
not just stale-cached** — after several rounds of edits (renamed/removed
functions, a new `components/ui/index.ts` export), the other session's
long-running Turbopack process started serving genuinely stale compiled
JS referencing symbols (`contactHref`, `resumeUrl`) that no longer existed
in source, confirmed by reading the actual files on disk and by a
completely clean **isolated `next build`** (via a temporary `distDir`
override in `next.config.ts`, so it wrote to `.next-verify/` instead of
touching the live server's own `.next/`) succeeding with zero errors.
Since fixing this required restarting a process shared with another
session, asked the user first rather than acting unilaterally — they
approved, so the stuck process was stopped (`Get-NetTCPConnection`/
`Stop-Process` on the PID holding port 3000), `.next` was cleared, and the
dev server was restarted clean via the normal `portfolio-dev` launch
config, which is what this session's dev server now actually is (no
longer "another chat's server" — see "Where things stand" above). One
side note worth remembering: right after that restart, `read_console_messages`
kept reporting the *same* old stale errors on the *original* tab even
though `read_page` on that identical tab showed genuinely fresh, correct
DOM content — opening a brand-new tab showed zero console errors
immediately. The console-message log is apparently sticky per-tab history
across navigations/reloads in this tool, not re-scoped per page load;
don't trust it over direct DOM/network evidence when the two disagree,
especially right after a server restart.

**Verified live with real inserted/temporary data, not just design
reasoning, the same way every prior phase did**: all five `contact_type`
values at once (LinkedIn/GitHub/Twitter-as-`other`/WhatsApp test rows
alongside the seed's Email row) — confirmed wa.me construction, external
`target="_blank" rel="noreferrer noopener"`, and the `other`-type fallback
icon all resolved correctly, then removed and cache-busted back to just
the seed's single Email row. The resume route's actual happy path (a
temporary placeholder PDF written to a `public/documents/resume/` that
doesn't otherwise exist in this repo, same reasoning as every other
seed-referenced asset path in this project) confirmed real byte-for-byte
streaming and the exact `Content-Type`/`Content-Disposition`/
`Cache-Control` headers, then the temp file and `public/` directory were
removed again. The no-active-resume redirect path was verified by
toggling `resumes.is_active` off and on directly in Postgres. **A few of
these checks briefly looked broken and weren't** — chaining a cache-bust
`curl` and the follow-up verification `curl` too tightly (even as two
separate tool calls back-to-back with no gap) intermittently read stale
data once or twice; a `sleep 1`–`2` between revalidating and re-checking
resolved it every time. Worth remembering as a lighter-weight cousin of
the `unstable_cache`-survives-a-restart lesson below: revalidation isn't
always instantaneously visible to the very next request either.

**Phase 17 — admin authentication and the protected shell.** The first
phase touching `app/admin/`. Two structural prerequisites had to happen
before any auth code could, plus the auth/shell work itself, plus a real
local-environment gap the phase surfaced.

**Prerequisite: `app/(site)/` route group.** The public site's Navbar and
Footer were rendered by the single root `app/layout.tsx`, unconditionally
wrapping *every* route — which would have put the public header/footer
around the admin panel's own sidebar/header too, since Next.js layouts
compose additively down the tree with no per-route opt-out except route
groups. Fixed by moving every public route (`page.tsx`, `projects/`,
`styleguide/`, `resume/`) into a new `app/(site)/` group with its own
layout carrying the Navbar/Footer/skip-link/PageTransition/siteSettings-
driven metadata (everything the old root layout used to render), and
shrinking the true root `app/layout.tsx` to just `<html>`/`<body>`, fonts,
`MotionProvider`, and `Toaster` — the pieces genuinely shared by both
trees. `/admin` sits as a sibling top-level segment with none of the
`(site)` group's chrome. Route groups don't change URLs, so every existing
public path is unchanged; only file locations moved (`@/` alias imports
meant zero import-path fixes were needed even for the deeply-nested
`styleguide/_components/` subtree).

**Prerequisite: `app/admin/(protected)/` route group, for a different
reason.** The brief's own requirement ("a server-side auth check inside
the /admin layout itself") reads as one literal `app/admin/layout.tsx`
doing the check for everything under it — but a layout that redirects
*every* unauthenticated child to `/admin/login` would also redirect
`/admin/login` itself (a child of that same layout) to `/admin/login`,
infinite-looping, since Next.js layouts have no built-in way to know
"this child *is* the login page" without pathname access a Server
Component layout doesn't get. The standard, documented resolution is
exactly the tool this codebase already reached for in the `(site)` case:
a route group. `app/admin/login/` is a sibling of `app/admin/(protected)/`,
not nested inside it, so the protected layout's auth check — the real
"layer 2" — only ever wraps pages that are actually supposed to require
it. No literal `app/admin/layout.tsx` file exists; the auth-checking
layout lives at `app/admin/(protected)/layout.tsx` instead, documented
directly in that file's header comment so the deviation from the brief's
literal path is explained on sight, not silently different.

**Two-layer route protection, deliberately split by cost, not
duplicated:** `proxy.ts` (originally written as `middleware.ts` — see
below) only checks *session existence* (`supabase.auth.getUser()`, one
token verification, no extra round trip) and refreshes the session
cookie on every `/admin/*` request; `app/admin/(protected)/layout.tsx`
is the only place that additionally calls `is_admin()` (an RPC, a real
`private.admins` table lookup). Checking `is_admin()` in *both* layers
would mean every admin request pays for two RPC calls to confirm the
same fact twice — the two layers each catch a different failure mode
instead (proxy catches "no session at all"; the layout catches "has a
session but isn't the admin," today only a theoretical case since
there's exactly one Supabase Auth user, but the code doesn't assume
that stays true). RLS (Phase 3) is the third, backstop layer neither of
the first two can be misconfigured *around* — even a bypassed proxy and
layout would still hit `is_admin()`-gated policies on every actual query.
Uses `getUser()`, never `getSession()`, in both layers — `getSession()`
reads the cookie's claims without revalidating them against the Auth
server, which defeats the point of a route guard.

**Next.js renamed `middleware.ts` to `proxy.ts` in this exact version** —
discovered from a real runtime deprecation warning after writing
`middleware.ts` the conventional way, not from reading changelogs ahead of
time. Migrated with Next's own `@next/codemod middleware-to-proxy`
codemod rather than hand-renaming (it also renames the exported function
`middleware` → `proxy`, which a manual rename would be easy to miss) —
the codemod refused to run against this repo's long-uncommitted git state
until passed `--force`, safe here since the change was scoped and
verifiable by diff afterward. `lib/supabase/middleware.ts` (the actual
session-refresh helper `proxy.ts` calls into) keeps its name — only the
special Next.js convention file at the project root was renamed, not
every file with "middleware" in it, and doc comments referencing the old
filename were updated to point at `proxy.ts` instead.

**Login form: `useActionState` + a native `<form>`, not `react-hook-form`**
— a deliberate departure from the pattern `lib/validation/README.md`
otherwise establishes for future admin forms. Two required fields don't
need `react-hook-form`'s `Controller`/`FormProvider` machinery, and given
the brief's own "security matters more than polish" framing, the
security-critical path reads more auditable as a plain form bound directly
to a Server Action than through an extra client-side form-state layer.
`lib/validation/adminLogin.ts` still exists and is still Zod (the same
"single source of truth" schema idea, just not paired with RHF this time).
**Error messages never reveal whether an email exists** — Supabase's own
`signInWithPassword` already returns one generic error for both "wrong
password" and "no such user," but the action's own post-sign-in
`is_admin()` check could easily have leaked "your password was right, you
're just not the admin" if handled carelessly; it doesn't — a failed
`is_admin()` check signs the session back out immediately and returns the
exact same generic string as a wrong password. Client-side "debounce
repeated attempts" (disable-while-pending plus a short forced cooldown
after 3 consecutive failures) is explicitly UX, not the real security
boundary — documented as such in the component, since Supabase Auth's own
server-side rate limiting is what actually stops brute-forcing and the
action already surfaces that distinctly (`status === 429`) when it fires.
**Open-redirect guard, verified live, not just written**: `next` query
params are validated (`resolveNextPath()` — must start with `/admin`, no
`://`, no leading `//`, no backslash) before ever reaching `redirect()`;
tried `?next=https://evil.com` end-to-end through a real sign-in and
confirmed it lands on `/admin`, never navigates off-site.

**Dashboard counts needed a data-access path lib/data's public modules
structurally can't provide**: every public `fetchX` hardcodes
`.eq("published", true)` in the query itself, not just relying on RLS —
so even an authenticated admin session calling `fetchProjects()` would
still only ever see published rows. New `lib/data/adminDashboard.ts`
queries the same tables without that filter, using the cookie-aware
`createClient()` (the signed-in admin's own session, which RLS's
`is_admin()` policies grant full visibility to) — twelve
`count: "exact", head: true` queries in parallel for
total/published/draft per entity, no row data transferred for the counts
themselves. Deliberately not wrapped in `unstable_cache` like every public
`getX`: it needs `cookies()` (forbidden inside `unstable_cache` anyway),
and with exactly one viewer, live-every-load is strictly better than
stale-for-up-to-an-hour. "Recently updated" edit links point at each
entity's section page (`/admin/projects`, not `/admin/projects/<id>`) —
no per-item edit route exists yet, so linking to one would just be a
different-shaped 404; the real editor phase replaces this along with the
`ComingSoon` placeholder pages.

**A real, previously-invisible local-environment gap, found by actually
trying to log in, not assumed away:** the local Supabase stack (Phases
1–16) never included the Auth service — `supabase/README.md`'s own
documented minimal `--exclude` flag set explicitly excludes `gotrue`,
because nothing before Phase 17 ever needed real authentication. Hit
"AuthRetryableFetchError: name resolution failed" (a 503 from Kong, no
backend registered for `/auth/v1/*`) trying to create a test admin user,
traced it to zero `supabase_auth_*` container existing at all (not
stopped — never created). **`supabase start` with a new, less-restrictive
`--exclude` list does not retroactively add services to an
already-initialized stack** — had to `supabase stop` (data preserved by
default; only `--no-backup` discards volumes) and `start` fresh for the
Auth container to actually get created. That cycle **regenerates the
project's JWT signing material**, silently invalidating every
`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` saved in
`.env.local` from before it — caught by the same "verify against the
real thing" instinct the original JWT lesson (below) already established:
`npx supabase status -o env` is the authoritative source, not whatever
was previously saved, and `.env.local` was updated to match before
anything else in this phase could be tested. A throwaway `tsx` script
(deleted after use, same pattern as every other throwaway verification
script in this project) created the local test admin via the service-role
Admin API — `private.admins` isn't reachable through the API even with
that key (by design, see docs/architecture.md), so granting admin access
was still a direct `docker exec ... psql` insert, exactly as
docs/deployment.md describes for a real project.

**The explicit "confirm it's impossible while signed out" check was done
literally, not assumed from the code**: a real incognito browser window
isn't available in this tool environment, so the closest faithful
equivalent — a `curl` request carrying zero cookies at all — was run
against all eleven `/admin/*` routes. Every single one returned a clean
`307` to `/admin/login?next=<original path>`, never a 200, never a crash.
Also verified live rather than assumed: successful login redirecting to
the originally-requested `next` path, sign-out actually clearing the
session (confirmed by re-attempting `/admin` afterward and landing back
on login, not just trusting the redirect response), the mobile drawer's
`role="dialog"`/`aria-modal`/body-scroll-lock/focus-trap (identical
`useFocusTrap`/`useLockBodyScroll` hooks Navbar's mobile menu already
uses), and that no client component anywhere in `app/admin/` or
`components/admin/` imports `lib/supabase/admin.ts` or
`SUPABASE_SERVICE_ROLE_KEY` (grepped directly, confirmed the only matches
are that file itself — already `server-only`-guarded — and docs).
**One check's result was a test-methodology artifact, not a bug**: using
`element.click()` via `javascript_exec` to simulate opening the mobile
drawer doesn't move focus the way a genuine user click does, so the
subsequent close-and-restore-focus check appeared to fail (focus stayed
on "Close menu" instead of returning to "Open menu") — confirmed by
checking `document.activeElement` immediately after the synthetic open
click and finding it was never the trigger button to begin with, so
there was nothing correct to restore *to*. The underlying mechanism is
unmodified from Navbar's/MediaLightbox's already-verified hook usage, not
new code this phase wrote its own version of.

**Phase 18 — shared admin infrastructure (done, verified live).** First
attempt (same phase, earlier session) hit an unresolved bug — the
create/edit form's submit never reached React's `onSubmit`, falling
through to a native browser GET — and was removed entirely rather than
built on top of. This is the second, independent attempt, rebuilt from
scratch, which succeeded and was verified live end-to-end.

**What was built**, per the brief's "every content module after this
should be mostly configuration" goal:

- **`lib/actions/shared.ts`** — `ActionResult<T>`, `actionSuccess`/
  `actionError`, `reorderInputSchema`, and `createAdminAction()`, the
  wrapper enforcing steps (a) session check + (b) admin check (reusing
  Phase 17's `getAuthenticatedAdmin()`) before an entity handler ever
  runs, catching/sanitizing any thrown error so a raw Postgres error can
  never reach the client. `parseInput()` — step (c) — parses against an
  *existing* `lib/validation` schema and reshapes a failed Zod parse into
  the `fieldErrors` shape `useAdminForm` maps onto `form.setError(...)`.
  Every entity action is a plain exported `const` wrapping
  `createAdminAction(handler)` (a higher-order-function pattern, not
  `async function` declarations) — deliberately, since this is still a
  valid `"use server"` export as long as the final bound value is an
  async function; documented inline since it's a slightly unusual shape
  for anyone expecting one-action-per-`async function`.
- **`lib/storage/upload.ts`** (client-safe: `uploadFile`, `removeFiles`,
  `extractStoragePath`, `buildStoragePath`) and **`lib/storage/
  cleanup.ts`** (server: `deleteStorageFolder`) — every uploaded file
  lives at `{bucket}/{recordId}/{uuid}.{ext}`, so one
  `deleteStorageFolder` call removes everything a record owns with no
  `storage_path` bookkeeping needed. Uploads go straight from the browser
  to Storage using the admin's own session (Storage's `authenticated` +
  `is_admin()` policies already cover it), not through a Server Action.
  No native upload-progress callback exists in the installed
  `@supabase/storage-js` — deliberately indeterminate-spinner UX instead
  of a byte percentage.
- **`components/admin/table/`** — `AdminTable` (generic over
  `{id, display_order, published}`, dnd-kit drag-to-reorder with
  optimistic update + rollback-on-failure, inline publish `Switch`, a
  `DropdownMenu` row-actions menu, an `AlertDialog` delete confirmation
  naming the item via a caller-supplied `getItemLabel`), `StatusPill`,
  `AdminTableSkeleton` (exported for a *JSX-scoped* `<Suspense>` fallback,
  not a route `loading.tsx` — see the hydration bug below for why).
- **`components/admin/form/fields/`** — nine field components
  (`TextField`, `TextareaField` — with a `markdown` flag standing in for
  "rich text or markdown" without a new editor dependency, since no
  public-facing markdown renderer exists yet either — `DateField`,
  `SelectField`, `SwitchField`, `NumberField`, `TagInputField`,
  `SlugField`, `RepeatableGroupField`). `SlugField`'s and `TagInputField`'s
  own local state (manual-override flag, debounced availability check,
  draft tag text) is owned by a dedicated sub-component invoked as real
  JSX inside `FormField`'s `render` callback, never called as a plain
  function there — that callback runs inline during `Controller`'s own
  render, not as its own JSX element, so it never gets its own Fiber and
  calling hooks directly inside it would be unsound. Both also hit the
  project's now-familiar `set-state-in-effect` lint rule (immediate
  synchronous transitions computed during render via a mirrored
  previous-value comparison; only the genuinely async callback's
  `setState` stays inside the effect) — same fix Phase 17's `LoginForm`
  and this same file needed.
- **`components/admin/form/useAdminForm.ts` + `AdminFormShell.tsx`** —
  the shared submit/validate/error/toast/unsaved-changes machinery.
  `zodResolver`'s TypeScript types (bridging Zod 3/4 signatures) can't be
  satisfied by a fully generic `<TSchema extends z.ZodType<FieldValues>>`
  wrapper without fighting variance errors indefinitely — one contained
  `schema as never` / `as unknown as Resolver<Values>` pair at the exact
  `zodResolver(schema)` call site resolves it; every *external* caller
  (every entity form) still gets a fully type-checked `form`/`onValid`
  pair. `AdminFormShell` is a plain `<form onSubmit={form.handleSubmit
  (onValid)}>` — no portal, no indirection between the tag and the fields
  it wraps, kept deliberately simple after the first attempt's unresolved
  submit bug.
- **`hooks/useUnsavedChangesGuard.ts`** — `beforeunload` for real browser
  navigation, a capture-phase `document` click listener for in-app
  `<Link>`/`<a>` clicks. **Directly implicated in the first attempt's
  submit bug** (the leading suspect at the time) **but conclusively
  cleared this time**: this rebuild uses the exact same
  capture-phase-click-listener design, and submission works correctly —
  so the first attempt's bug was never actually this hook (it was the
  `loading.tsx` hydration issue below, present in both attempts).
- **`components/admin/upload/ImageUploader.tsx` +
  `MultiImageUploader.tsx`** — drag/drop + click, instant local preview
  via `URL.createObjectURL`, client-side validation via the entity's own
  `fileSchema(STORAGE_BUCKETS.x)`, remove (clears the field immediately,
  attempts a same-instant storage delete non-fatally), gallery variant
  adds multi-select + dnd-kit reorder.
  `MultiImageUploader`/`RepeatableGroupField` are both built to spec but
  **unproven end-to-end** — no entity with a gallery or repeatable-group
  field has been wired up yet (Education has neither).
- **`components/admin/PageHeader.tsx`, `EntityFormPageShell.tsx`,
  `EmptyState.tsx`** — shared list-page header, create/edit page shell,
  and "no items yet" state, deliberately separate from `components/ui/`'s
  public-site equivalents per CLAUDE.md's admin/public primitive
  boundary.
- **Education, wired through everything above**: `lib/data/education.ts`
  gained `AdminEducation`, `fetchEducationForAdmin`,
  `fetchEducationByIdForAdmin`; `lib/actions/education.ts` has all six
  actions; `deleteEducation` calls `deleteStorageFolder` first;
  `duplicateEducation` clears the copy's logo URL rather than pointing it
  at the original's storage folder.

**Two real bugs, found live and fixed** — full technical writeup in
[docs/content-management.md](./content-management.md#two-real-bugs-found-and-fixed-while-proving-this-phase),
summarized here:

1. **A route-level `loading.tsx` broke hydration for nested dynamic
   routes.** This *was* the first attempt's unresolved submit bug,
   reproduced identically in this second, independently-written attempt —
   proving it was never about `AdminFormShell`, `useAdminForm`,
   react-hook-form, or `useUnsavedChangesGuard` (all prime suspects last
   time). Root cause: `app/admin/(protected)/education/loading.tsx`
   (meant only for the list page) also wrapped `new/` and `[id]/edit/`
   (Next's `loading.js` convention cascades to a segment's nested
   children), and on this exact Next.js 16.3.1 + Turbopack + React 19
   combination, that combination reproducibly breaks client hydration for
   the nested dynamic route's streamed content on a hard navigation —
   confirmed by checking for `__reactFiber$`/`__reactProps$` keys
   directly on the DOM (present on a sibling client component, absent on
   every node inside the form, despite the form's component function
   demonstrably executing) and by a clean bisection (a bare
   `<form onSubmit={preventDefault}>` reproduced the exact same failure;
   removing `loading.tsx` fixed it; restoring `loading.tsx` broke it
   again, identically). Fixed by deleting the route-level `loading.tsx`
   and using a plain JSX-scoped `<Suspense>` around just the list page's
   own data-fetching component instead (see
   `app/admin/(protected)/education/page.tsx`) — which doesn't cascade to
   sibling segments the way the file convention does.
2. **dnd-kit's default `<DndContext>` accessibility id isn't
   SSR-deterministic** — produced a real (if non-fatal) hydration
   mismatch on `aria-describedby` (`DndDescribedBy-0` server vs.
   `DndDescribedBy-1` client), caught via the Next.js dev overlay's issue
   badge while verifying the education list page, not assumed away.
   Fixed by passing a fixed, unique `id` prop to every `<DndContext>`
   (`"admin-table"`, `"multi-image-uploader"`).

**All six required operations verified live** against the real local
Supabase stack, in a real browser, with results confirmed via `docker
exec ... psql` directly against Postgres and (for publish-affecting
operations) by reading the rendered public homepage:

- **Create** — filled and submitted the real form (`form_input` for field
  values, a genuine `.click()` — not a synthetic `dispatchEvent` — on the
  actual submit button), confirmed the new row in Postgres, confirmed the
  success toast, confirmed the redirect to the list page.
- **Edit** — same pattern against `[id]/edit`, confirmed the changed
  field in Postgres.
- **Publish** — confirmed `published` flipped `true` in Postgres *and*
  the entry appeared on the live public homepage's Education section
  within the same request (proving `updateTag`/`revalidatePath` actually
  bust `getEducation()`'s cache, not just written and assumed).
- **Unpublish** — same toggle, same code path, confirmed the row
  disappeared from the public site again.
- **Delete** — this one specifically needed the Browser pane to be
  genuinely displayed/composited (the environment's own
  `document.visibilityState` was `"hidden"` for a long stretch of this
  session, which blocks pixel-coordinate clicks and Radix's
  pointerdown-based dropdown trigger — confirmed directly, not assumed;
  see "Recurring lessons" below for the addition to that entry). Once
  displayed: opened the real row-actions dropdown, clicked Delete,
  confirmed the "Delete \<item name\>?" dialog named the correct row,
  confirmed, verified the row gone from Postgres.
- **Reorder** — real pixel drags (`left_click_drag`) didn't register with
  dnd-kit's `PointerSensor` (too few intermediate pointer-move events for
  its internal activation/collision logic, confirmed by logging actual
  `pointerdown`/`pointermove`/`pointerup` events during the attempt — 2
  moves total wasn't enough); a manually-dispatched `PointerEvent`
  sequence with ~15 intermediate `pointermove` steps and small delays
  between them, targeting the grip handle's real
  `getBoundingClientRect()` coordinates, did register and completed the
  drag correctly. Confirmed the new `display_order` in Postgres and the
  new order on the public homepage.

Test rows (`Test University`, `Second Test College`) created during this
verification were deleted afterward and `Example University`'s
`display_order` reset to `0`, restoring the `education` table to exactly
`supabase/seed.sql`'s original single row; a throwaway `/api/debug-
revalidate` route (same pattern Phase 14/15 established) busted the
public-site cache after that direct-SQL cleanup, then was deleted.

**Phase 19 — Profile, Skills, and Experience admin modules (done, verified
live).** The first three real content editors built on top of Phase 18's
proven infrastructure — per that phase's own goal, each was "mostly
configuration," but building and live-testing all three still surfaced
two genuine, previously-latent bugs (both written up in
[docs/content-management.md](./content-management.md#two-more-real-bugs-found-live-while-building-phase-19)
in full) and required three small, generic, backward-compatible additions
to the shared components themselves (also documented there, under "Phase
19 additions to shared infrastructure"): `AdminTable` gained optional
`onTogglePublished` (omit for an entity with no publish concept) and
`onRequestDelete` (an escape hatch for a delete flow needing more than a
yes/no confirmation); `NumberField` gained `allowEmpty` (a cleared input
commits `null`, not `0`); `TextareaField` gained `maxLength` (a live
character-count caption).

**Profile** (`app/admin/(protected)/profile/`, `components/admin/profile/
ProfileForm.tsx`) is a single-record upsert, not a list — `profile` is a
singleton table (`is_singleton boolean unique`), so there's no create/edit
page pair, no delete, no publish toggle, just one form always showing
whatever the singleton row currently holds (or blank, the very first
time). `lib/actions/profile.ts`'s one action, `upsertProfile`, upserts on
the `is_singleton` unique column — the same action handles "no row yet"
and "editing the existing row." Every field's `description` text states
exactly where it renders on the public site (sourced from actually
reading `Hero.tsx`/`About.tsx`, not guessed), and `short_bio`/`long_bio`
use the new `TextareaField` `maxLength` prop for the brief's "live
character count" requirement.

**Skills** (`app/admin/(protected)/skills/`, `components/admin/skills/`)
is two related entities sharing one screen, per the brief: a
`SkillCategoryTable` (categories: create/edit/reorder/delete-with-choice)
followed by one `SkillCategorySection` per category (that category's own
skills: a quick-add textarea + the standard skill `AdminTable`). **The
delete-with-choice requirement was the one genuinely new UI pattern this
phase needed**: `skills.category_id references skill_categories(id) on
delete restrict`, so deleting a category that still has skills can't just
cascade or silently orphan — `SkillCategoryTable` intercepts the delete
via `AdminTable`'s new `onRequestDelete` prop and shows its own
`AlertDialog` with two radio options (delete the skills too, or move them
to another category first, picked via a `Select`), Delete disabled until
a category with skills actually gets one of the two chosen. Verified
**both** strategies live, not just one: a throwaway category with 1 skill
deleted via "move" (skill's `category_id` updated, confirmed in Postgres),
a second throwaway category with 2 skills deleted via "delete-skills"
(both skill rows gone, confirmed in Postgres). **Bulk-add**
(`BulkSkillAdd.tsx`, the brief's "add several skills without a full page
reload per skill" requirement) is a plain textarea (one name per line) +
`createSkillsBulk` — one array `insert()` of N rows, `display_order`
continuing from the category's existing skill count, all landing
unpublished — verified live with a 2-line paste producing "2 skills ready
to add" → both rows in Postgres with the right `display_order`. Skill
`proficiency` (optional 0–100) is the first field in this codebase to
need `NumberField`'s new `allowEmpty` — verified by clearing it back to
blank and confirming Postgres stored `null`, not `0`.

**Experience** (`app/admin/(protected)/experience/`,
`components/admin/experience/ExperienceForm.tsx`) is the closest match to
Education's own six-action shape (no `duplicateExperience` — not asked
for in the brief, so not built, per CLAUDE.md's "don't scaffold ahead of
phase"). Two rules the brief specifically asked for, both verified live:
**turning on "Current role" clears and disables End date** (adjusted
during render comparing against a mirrored previous `is_current` value —
the same setState-in-effect-avoidance pattern `AdminTable`/`SlugField`/
`LoginForm` already use elsewhere in this codebase — confirmed via
`el.disabled`/`el.value` directly on the DOM, not just visually), and
**end_date can't be before start_date** (a second `.refine()` chained
onto `experienceSchema`'s existing one in `lib/validation/experience.ts`
— tried submitting a 2023 end date against a 2024 start date, got "End
date can't be before the start date" inline, not a raw Postgres error).
The **computed duration preview** reuses `lib/utils.ts`'s existing
`formatDuration()` unmodified (`components/sections/Experience.tsx`'s
timeline already calls it) — watches `start_date`/`end_date`/`is_current`
live and renders "Duration shown on the public site: 2 yrs 7 mos" as the
admin types, confirmed the number actually changes when toggling Current
role on.

**Two real bugs, found live and fixed** (full writeup in
[docs/content-management.md](./content-management.md#two-more-real-bugs-found-live-while-building-phase-19)):
(1) `optionalUrlSchema` (Phase 4) requires an absolute URL, but
`supabase/seed.sql` seeds every logo/avatar column with a placeholder
root-relative path (`/images/avatar.jpg`) — since no real asset pipeline
exists yet — which meant saving Profile, or editing the pre-existing
seeded Education row, failed validation on a field the admin never
touched. Fixed with a new `optionalImageUrlSchema`
(`lib/validation/shared.ts`) accepting either an absolute URL or a
root-relative path, swapped into `profile.avatar_url`,
`experience.company_logo_url`, and retroactively into
`education.institution_logo_url` — confirmed by saving the untouched
seeded Education row before (failed) and after (succeeded) the fix. (2)
`revalidateSkills()`, needed by both `lib/actions/skillCategories.ts` and
`lib/actions/skills.ts`, was first written as a plain sync function
`export`ed from the former — but Next requires every function exported
from a `"use server"` file to itself be an async Server Action, so
`/admin/skills` 500'd immediately ("Server Actions must be async
functions"). Fixed by moving it into a new plain module,
`lib/actions/skillsShared.ts` (no `"use server"` directive, same as
`lib/actions/shared.ts`), imported by both action files.

**Verified live end-to-end against the real local Supabase stack**, same
standard as every prior phase: Profile's full save round-trip (edited
`tagline`, confirmed in Postgres, confirmed on the public homepage,
reverted); Skills' bulk-add, both category-delete strategies, a full
skill edit (proficiency + publish), and the public site reflecting a
newly-published skill, all with throwaway categories/skills
(`ZZ Category A`/`B`, `ZZ Skill *`) created and then fully deleted
afterward (`docker exec ... psql`), restoring `skill_categories`/`skills`
to exactly `supabase/seed.sql`'s one category/one skill; Experience's
create → validation error → is_current fix → duration preview → publish
→ public-site confirmation → delete cycle, restoring `experience` to
exactly its one seeded row. A throwaway `/api/debug-revalidate-skills`
route (same established pattern) busted the public cache after each
direct-SQL cleanup, then was deleted.

**One environment issue hit and resolved, not an application bug**: the
Browser pane tab had never been displayed this session, so
`document.visibilityState` was `"hidden"` — this didn't just block
screenshots (the already-documented symptom from Phase 18) but stalled
React's *hydration* of anything behind a Suspense boundary specifically,
confirmed by checking `__reactProps$` keys directly: the root layout's
sidebar toggle had them, but a `<Switch>` deep inside `/admin/education`'s
already-shipped, already-verified `AdminTable` did not, in the same tab,
proving it wasn't new Phase 19 code. Bulk-add's textarea and every
publish-toggle Switch were unclickable/inert until the user actually
displayed the pane, after which hydration completed immediately and every
interaction worked normally. Worth checking `__reactProps$` presence
first the next time something inside a Suspense boundary seems
inexplicably inert, rather than assuming new code broke it.

**Phase 20 — Projects, the most important admin module (done, verified
live).** The target workflow from the brief — Projects → Add Project →
enter information → upload logo → add technologies → add features →
upload screenshots → add GitHub/demo links → preview → publish — is what
this phase built toward literally, per CLAUDE.md's Phase 20 instructions.
Projects is structurally the biggest entity yet: one parent table plus
three child tables edited together on one screen, a genuinely new
draft/publish distinction (only Projects has fields that are optional to
*save* but required to *publish*), and the first entity to actually
exercise several pieces of shared infrastructure that had been built but
never proven end-to-end.

**Draft safety, built as a schema-level distinction, not a UI
convention**: `lib/validation/project.ts`'s `projectSchema`/
`projectFormSchema` don't require `name`/`slug`/`short_description` at
the field level at all — a `.superRefine` enforces those three *only*
when `published === true`, so the exact same schema validates a bare
draft save and a publish attempt correctly. Verified live, not just
reasoned about: clicked **Create** on a completely untouched, all-blank
form and it saved successfully (`lib/actions/projects.ts`'s
`resolveSlug()` fills in a slug server-side — from the name if there is
one, otherwise a short random fallback — since the database column is
still `NOT NULL UNIQUE` and can't stay blank the way a draft's other
fields can); then confirmed the *opposite* case — toggling **Published**
on that same still-blank draft via the list's inline switch — correctly
failed with "Add a name, a short description before publishing." (the
slug was already non-empty from the auto-fallback) and the row stayed
unpublished in Postgres. `toggleProjectPublished` re-checks these three
fields itself, since the inline list-page toggle doesn't go through the
form's own schema.

**Child tables (`project_technologies`/`project_features`/
`project_media`) are a full replace on every save**
(`writeProjectChildren()` in `lib/actions/projects.ts`: delete every
existing row for the project, then bulk-insert whatever the form
currently holds, `display_order` assigned from array position) — simple
and correct specifically because Storage cleanup for a *removed* gallery
item already happens independently and immediately, client-side, the
moment the admin removes it in the new `ProjectMediaManager`, so this
function only ever has to reconcile rows, never orphan files. Verified
live: technologies (ordered chips via `TagInputField`), a feature
(`RepeatableGroupField`, title + description), and a gallery image
(`ProjectMediaManager`) all round-tripped correctly through Postgres in
both create and edit.

**Two shared-infrastructure pieces got their first real proof, and one
needed a genuinely new component**: `SlugField`'s `checkAvailability` prop
(`checkProjectSlugAvailability` in `lib/actions/projects.ts`, scoped to
"any *other* project with this slug") and `RepeatableGroupField` (the
Features tab) were both flagged as built-but-unproven since Phase 18/19 —
both now proven live. `MultiImageUploader`, also flagged unproven, turned
out not to fit: `project_media` rows carry real per-item metadata
(`media_type`, `title`, `alt_text`, `caption`), which a plain
ordered-array-of-URLs uploader can't represent — so Projects uses a new,
dedicated `ProjectMediaManager` instead, built from the same proven
primitives (`uploadFile`/`removeFiles`/`buildStoragePath`, dnd-kit reorder
with a fixed `DndContext` id). Verified live: upload with a real per-item
media-type default derived from the file's MIME type, missing-alt-text
warning shown/cleared correctly, drag-to-reorder, and delete-with-
confirmation that also removed the real Storage object (confirmed via
`storage.objects` directly, both before and after).

**The slug-change-on-a-published-project requirement was answered
structurally, not with a migration step**: every upload (logo, cover
image, gallery) lives at `projects/{project.id}/...` — keyed by the row's
own id, never its slug (the same `{bucket}/{recordId}/{uuid}.{ext}`
convention every entity's uploads already use) — so renaming a project's
slug can never leave media pointing at a dead path, and there is nothing
to migrate. `ProjectForm` still shows a loud, explicit warning banner when
editing a *published* project and the slug field's current value differs
from what's saved, since the slug is also the project's live public URL
(`/projects/<slug>`) and changing it breaks any link already shared to
it — verified live by editing the seed project's slug and confirming the
banner appeared, then reverting without saving.

**The "preview" step needed a real route, not a UI affordance**: the
public `/projects/[slug]` page always filters `published = true`
(`getProjectBySlug`), so an admin previewing a draft would just get a
404 there. `app/admin/(protected)/projects/[id]/preview/page.tsx` reuses
the public detail page's exact presentational pieces (`ProjectCardImage`,
`ProjectStatusBadge`, `ProjectMediaGallery`, the same Overview/context-
block/Technologies/Key-Features layout) against `fetchProjectByIdForAdmin`
— the admin data path, which ignores the `published` filter — with a
"Draft preview — not visible to the public yet." banner and a "Back to
editor" link. Verified live for a still-unpublished draft.

**List page**: `ProjectsListClient.tsx` wraps the generic `AdminTable`
with search (by name/slug) and a published/draft filter, plus a second
inline toggle (Featured) alongside the standard Published one — a
project-specific addition, not a new `AdminTable` prop, since no other
entity needs two independent toggles per row. **Reordering while
filtered needed real care, not just wiring `AdminTable` through**:
`AdminTable`'s `onReorder` always hands back only the currently-*visible*
rows, resequenced from 0 — submitting that directly while a search/filter
is active would silently collapse every *hidden* row's `display_order`
into the same tight range. `handleReorder` merges the new visible order
back into the full canonical list first (hidden rows keep their relative
position; only the visible ones take on the admin's new order), then
submits the merged full order — reasoned through with a concrete
before/after example rather than assumed correct, since this is exactly
the kind of bug that would silently corrupt data only visible once a
filter is later cleared.

**Three real bugs, found live and fixed** — full technical writeup in
[docs/content-management.md](./content-management.md#real-bugs-found-and-fixed-while-proving-phase-20-projects),
summarized here:

1. **`SlugField`'s auto-derive-from-name broke under React Strict Mode.**
   The first time `checkAvailability` was actually wired up for real (this
   phase), a live "Cannot update a component (`Controller`) while
   rendering a different component (`SlugControl`)" warning appeared — the
   field's original render-time `onChange` call (adjusting the *parent*
   Controller's state, not its own) was never sound and had to move into
   a `useEffect`. A first attempted fix (a plain "have I run yet" boolean
   ref) looked right in isolation but was *worse* once retested: it
   silently wiped an already-saved slug back to `""` on page load for a
   draft with a blank name, because Strict Mode's dev-only double-invoke-
   on-mount defeats a boolean flag (it flips to "already ran" after the
   *first* of the two simulated mount passes, so the second no longer
   skips). Fixed by tracking the actual last-seen `sourceValue` in a ref
   instead of a boolean — correct regardless of how many times the effect
   happens to run for the same underlying value.
2. **The gallery uploader's `onChange` silently never ran.** Both the new
   `ProjectMediaManager` and the pre-existing, never-proven
   `MultiImageUploader` captured `event.target.files` (a *live* FileList
   tied to the input) into a variable and only *then* reset
   `event.target.value = ""` — which empties that same live object in
   place, so the `files.length > 0` check that followed always failed and
   `handleFiles` never ran, with zero error, toast, or network request to
   explain why. Confirmed directly (capture the reference, clear `.value`,
   re-read the *original* reference's `.length`: `0`). `ImageUploader`
   never hit this because it extracts the actual `File` object immediately
   (`files?.[0]`) rather than holding the FileList container. Fixed in
   both files by copying out the File objects via `Array.from(...)` before
   the reset — this was a real, previously-undiscoverable latent bug in
   already-shipped Phase 18 code, only surfaced because Phase 20 was the
   first phase to actually exercise a multi-file upload against a live
   Storage backend.
3. **`toLocaleDateString()` produced a real hydration mismatch** on the
   list table's "Updated" column (`"Aug 17, 2026"` server vs.
   `"17 Aug 2026"` client — different locales in the Node render pass vs.
   the browser). Fixed with a new `formatAdminDate()` in `lib/utils.ts`,
   hand-formatting the date without `toLocaleDateString` at all — the same
   fixed-output-regardless-of-locale approach this file's other date
   helpers already use for plain date columns, now extended to a full
   `timestamptz`.

**A real, previously-excluded environment gap, found by actually trying
to upload a file, not assumed away**: the local Supabase stack's
long-standing minimal `--exclude` flag set (Phases 1–19) excludes
`storage-api` entirely — there had never been a real Storage backend
running locally, so no entity's `ImageUploader`/`MultiImageUploader` usage
in Phases 18–19 had ever actually been proven against one either, only
built and reviewed. Discovered when a gallery upload attempt produced
zero network requests and zero errors (before the FileList bug above was
even isolated) and `docker ps` showed no `supabase_storage_*` container.
Fixed the same way Phase 17 added Auth: `npx supabase stop` (data
preserved) then `npx supabase start` with a revised `--exclude` list
keeping `storage-api` in — confirmed via `npx supabase status -o env`
that the JWT/keys this time stayed identical to what was already in
`.env.local` (restored from Docker's own backup), unlike Phase 17's cycle,
which did regenerate them; see "Where things stand" above for why neither
outcome should be assumed without checking.

**Verified live end-to-end against the real local Supabase stack**, same
standard as every prior phase: a fully blank draft create → edit (name,
slug auto-derive, logo/cover/gallery upload, technologies, a feature,
GitHub/demo links) → publish (with the gate correctly blocking a second,
separate blank draft) → confirmed on `/projects` and
`/projects/<slug>` with zero manual cache-busting needed → search and
status-filter on the list page → delete-with-storage-cleanup for both
test rows (confirmed `storage.objects` for the `projects` bucket empty
afterward, not just the Postgres rows gone). `projects`,
`project_technologies`, `project_features`, and `project_media` are back
to exactly `supabase/seed.sql`'s original one row each afterward.

**Phase 21 — the remaining modules, preview mode, and the blog seam; the
admin panel is complete (done, verified live).** Seven deliverables. Three
(Certifications, Achievements, Contact) were close to pure configuration on
top of Phases 18–20, exactly as Phase 18's "mostly configuration" goal
intended. The other four each needed something genuinely new, and in every
case the new thing was made generic rather than entity-specific — all
written up in
[docs/content-management.md](./content-management.md#phase-21-additions-to-shared-infrastructure).

**Certifications / Achievements / Contact** follow the standard five-step
entity shape verbatim. Two things worth noting: **`FileUploader`** is a new
sibling to `ImageUploader` (`components/admin/upload/FileUploader.tsx`) —
`ImageUploader` renders its value as an `<img>`, which is simply wrong for a
column that may hold a PDF (a certification's certificate, an achievement's
supporting document): you get a broken-image icon. `FileUploader` is the
same upload/remove/validation mechanics with a filename-plus-open-link
presentation, confirmed live showing `aws-ml-specialty.pdf` as a real link
on the seeded certification. And **Contact needed a new sidebar destination**
(`/admin/contact`, added to `components/admin/adminNav.ts`) — every other
Phase 21 module replaced an existing `ComingSoon` placeholder, but contact
links never had a nav entry at all.

**Contact's per-type validation** (requirement 3) chains three refinements
onto `contactLinkSchema`: a valid email for `email`, a valid phone number
for `whatsapp`, and a required profile URL for
`linkedin`/`github`/`twitter`. That last one exists because
`lib/contactLinks.ts`'s `resolveContactHref` uses `url` as-is for those
types and returns `null` without it — meaning the renderer would silently
*skip* a row the schema had happily accepted. Validation and rendering now
agree. **Contact's live preview** (`ContactPreview.tsx`) renders the real
public `ContactContent` component against the currently-published set, not
a mock — so it's structurally incapable of drifting from the real section,
and it goes empty (with an explanatory line) exactly when the public
section would hide itself.

**Resume** (requirement 4) is the first module that deliberately *doesn't*
follow the entity shape: no create/edit page pair, since upload and
activate are the only writes. **The atomic active-swap was the real
requirement** ("in a transaction or via the partial unique index, not with
two separate updates"), and it's a new Postgres function,
`public.set_active_resume(uuid)` — one function call is one implicit
transaction, so deactivate-then-activate commit or roll back together and
there is never a window with zero active rows. `createResume` always
inserts inactive first and only then calls the RPC, so even a failure
between those steps can't produce two active rows. `deleteResume` refuses
to delete the currently-active version (the UI disables that button with an
explanatory tooltip) — a deletable active resume would let the public site
lose its download link, a worse failure than one extra click.

**Settings** (requirement 5) is a singleton upsert like Profile.
`fetchSiteSettingsForAdmin` reads the **base `site_settings` table**, not
the `public_site_settings` view every public read uses — the view omits
`id` (which the upsert needs) and the base table has no public-read RLS
policy at all, so this must use the cookie-aware `createClient()`. The
**nav editor** is the piece that matters (it's how future sections reach
the nav without code): `NavItemsField` wraps the already-proven
`RepeatableGroupField` for add/rename/reorder, plus a per-item
Visible/Hidden toggle that is deliberately *not* `SwitchField` — hiding an
item whose section still has published content behind it needs a
confirmation step, which a plain field component has no hook for.
`sectionHasContent` is computed from the same published-only `getX()` reads
the public site itself calls, since "does this section have anything behind
it" is exactly what decides whether it renders at all. **`hidden` is stored
inside the existing `primary_nav` jsonb rather than as a schema change**,
and `fetchSiteSettings` filters hidden entries out *and strips the flag*, so
the public `NavItem` type stays `{label, href}` and Navbar/Footer never
learn the concept exists.

**Preview mode** (requirement 6, flagged in the brief as "do this
properly") **replaced** Phase 20's standalone
`app/admin/(protected)/projects/[id]/preview/page.tsx`, which is now
deleted. That page *reused* the public page's components, but it was still
a second page free to drift. Real Next.js draft mode instead makes **the
actual public route** render unpublished content, so there is structurally
nothing to drift. `app/admin/preview/enable/route.ts` is the only thing that
can call `draftMode().enable()`, and it runs `getAuthenticatedAdmin()`
first — the same gate every mutating action uses — plus the same
open-redirect guard `resolveNextPath` applies to logins (`path` must start
with `/projects/`, no scheme, no `//`, no backslash). It sits *outside*
`(protected)` on purpose: it's a Route Handler, not a page, and wrapping a
redirect in the admin shell layout would be meaningless.
`app/(site)/projects/[slug]/page.tsx` reads `draftMode()` and swaps
`getProjectBySlug` for the new uncached, cookie-aware
`fetchProjectBySlugForPreview` (`generateMetadata` makes the same swap).
`DraftPreviewBanner`'s dismiss (X) and "Exit preview" are deliberately
separate controls — dismiss hides the banner locally while draft mode stays
on; exit actually clears the cookie. **A worry that turned out fine, checked
rather than assumed**: reading `draftMode()` did *not* force
`/projects/[slug]` dynamic — `next build`'s route table still lists it as
`●` (SSG, prerendered), so Phase 13's deliberate ISR behavior is intact.

**Blog** (requirement 7) is intentionally minimal — list + form, no public
route, no cache tag, no revalidation, since `lib/data/blogPosts.ts` has no
public consumer to invalidate. All three route files re-check
`blog_enabled` themselves rather than trusting the sidebar's disabled
state, since a direct URL visit bypasses that. `resolvePublishedAt` lives
in a new plain module, `lib/actions/blogShared.ts`, **specifically to avoid
repeating Phase 19's trap** (a sync helper exported from a `"use server"`
file breaks the whole file) — and keeping it there made it directly
unit-testable, which is how its four cases were actually verified rather
than asserted.

**Two real bugs, found live and fixed** — full writeups in
content-management.md:

1. **Phase 19's relative-asset-path validation bug, repeating across five
   more schemas.** `supabase/seed.sql` seeds *every* asset column with a
   root-relative placeholder (`/images/organizations/aws.png`,
   `/documents/certifications/aws-ml-specialty.pdf`,
   `/images/og-cover.png`, ...), but Certifications, Achievements, Blog,
   and Settings had all been written with the strict `optionalUrlSchema` —
   so editing any seeded row would have failed validation on a field the
   admin never touched, exactly as Profile/Education did in Phase 19.
   **Found by reading the seed against the new schemas before testing them,
   not by hitting it.** Fixed by applying the existing exemption schema to
   `certifications.organization_logo_url`/`certificate_file_url`,
   `achievements.image_url`/`document_url`, `blog_posts.cover_image_url`,
   and `site_settings.og_image_url`. Genuine external links
   (`credential_url`, `external_link`, `github_url`, ...) keep the strict
   schema. Also **renamed `optionalImageUrlSchema` → `optionalAssetUrlSchema`**,
   since two of the newly-covered columns hold PDFs rather than images and
   the old name read wrong at those call sites. Verified by loading the
   seeded certification's edit page and saving it *untouched*: it redirected
   to the list with zero field errors, and Postgres confirmed a real write
   (`updated_at` bumped) with both root-relative paths intact.
2. **The WhatsApp phone regex rejected `(555) 123-4567`.** The first
   attempt, `/^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/`, required the character
   right after the optional `+` to be a digit — so an entirely ordinary
   US-formatted number starting with a parenthesis failed, while the admin
   guide I'd just written promised "spaces, dashes, brackets and a leading
   `+` are all fine." Caught by running the schema against a table of real
   formats rather than eyeballing the regex. Fixed by validating on **digit
   count** (7–15, the E.164 range) plus an allowed-character check, which
   also mirrors how the value is actually consumed — `resolveContactHref`
   builds the `wa.me` link by stripping every non-digit. Re-verified across
   14 cases: 8 real formats (US/UK/India, parens/dashes/dots/spaces) all
   accepted and each producing a correct `wa.me` URL, 6 garbage inputs all
   rejected.

**Verified live end-to-end against the real local Supabase stack**, same
standard as every prior phase:

- **Draft-mode preview, the full lifecycle** — unpublished the seeded
  project through the admin's own inline switch, confirmed the public
  `/projects/customer-churn-prediction` returned a genuine **404** to an
  anonymous request; enabled preview and confirmed **the same URL** rendered
  the draft with the real `<h1>`, real page title, and every real section
  (Overview / The Problem / The Solution / Purpose / Technologies / Key
  Features / Gallery) with genuine content (`scikit-learn`, a feature's
  title *and* description, GitHub + Live Demo links) plus the banner and a
  working "Exit preview" link; confirmed the draft-mode cookie is
  **httpOnly** (`document.cookie` can't see it); then exited and confirmed
  the same page 404s again *in the same browser session*. Also confirmed
  `/admin/preview/enable?path=...` redirects a signed-out request to
  `/admin/login` — the "never a guessable URL" requirement.
- **Resume atomic swap** — two versions in the table, clicked "Set active"
  on the inactive one, confirmed in Postgres that the old one flipped to
  `false` and the new to `true` with **exactly one** active row. Separately
  confirmed the partial unique index is a real backstop beneath the RPC: a
  raw `UPDATE` forcing a second active row fails with `duplicate key value
  violates unique constraint "resumes_single_active_idx"`. Confirmed the
  active version's delete button is disabled with the "Activate a different
  version first" tooltip.
- **Settings nav hide-with-warning** — clicked a visible item's toggle,
  confirmed the confirmation dialog appeared with the correct title and
  body copy, confirmed it, saved, and verified both that `hidden: true`
  persisted into the jsonb **and that `#about` disappeared from the public
  homepage's nav** while the other three links remained. Restored
  afterward.
- **Blog behind the flag** — with the flag on, the list rendered the seeded
  post and its edit form saved cleanly; with it off, `/admin/blog` shows
  "Blog is disabled", `/admin/blog/new` **redirects** to `/admin/blog`, and
  the sidebar renders Blog as a non-link `<span aria-disabled="true">` with
  an explanatory title. `/blog` on the public site 404s throughout — there
  is no public blog.
- **Certifications** — the expired/valid indicator renders in the list
  ("Valid until Jun 2027"); the expiration-after-issue rule was verified
  across four cases (after / before / equal / absent) including that an
  expiry equal to the issue date is allowed.
- **Clean `next build` and clean `npx eslint .`** (both exit 0) after every
  change, with the route table confirming all 15 new/changed routes and
  `/projects/[slug]` still prerendered.

Every test row created during verification was removed afterward; all 15
tables are back to exactly one seeded row each and **zero objects in every
Storage bucket**, confirmed by a single row-count query at the end.

**Environment notes specific to this phase**, all worth not re-discovering:

- **`npx supabase db reset` wipes `auth.users` and `private.admins`** along
  with the content tables, so the Phase-17 local test admin
  (`test-admin@example.com` / `Test-Admin-Pass-123!`) stopped existing the
  moment the new migrations were applied. Recreating it is two steps, both
  fast: `POST {SUPABASE_URL}/auth/v1/admin/users` with the service-role key
  as both `apikey` and `Authorization: Bearer` (body
  `{"email":...,"password":...,"email_confirm":true}`), then a `docker exec
  ... psql` insert into `private.admins` selecting that user's id — the
  same route Phase 17 documented, just with `curl` instead of a throwaway
  `tsx` script.
- **Phase 14's shared-dev-server lesson bit again, and the documented fix
  is still the only one.** Another chat session's `next dev` held port 3000
  against this same directory. Setting `"autoPort": true` in
  `.claude/launch.json` did **not** help — Next 16's dev-server lock is
  keyed to the **project directory, not the port**, so a second instance is
  refused even when it successfully binds a different port (it starts, logs
  "Another `next dev` server is already running", and exits 1). Reverted
  that config change; pointed the Browser pane at the existing
  `localhost:3000` origin instead, which picks up saved edits via normal
  HMR exactly as Phase 14/15 found. Worth knowing the failure mode looks
  like a *successful* start followed by an immediate exit, not a bind
  error.
- **`rm -rf .next` while another session's dev server is running is worse
  than it sounds** — that directory belongs to the running process. Doing
  it here (to clear a stale `.next/types` cache before `tsc`) forced the
  other session's server to recompile from cold. It recovered fine
  (verified: `/` returned 200 and every new admin route returned a correct
  `307` to login afterward), but the cleaner move is `npx next typegen`, or
  a full `next build`, which regenerates the route types without deleting
  anything. Deleting `.next` also makes a bare `npx tsc --noEmit` fail with
  two spurious `Cannot find name 'LayoutProps'` errors, since that global
  is generated into `.next/types` — run `next build` (or `next typegen`)
  before trusting a standalone `tsc` run.
- **Radix `Select` could not be opened by synthetic events in this pane**,
  even with the full `PointerEvent` sequence that works for
  `DropdownMenu` (Phase 18) — neither `pointerdown`/`pointerup`, nor
  `.click()`, nor a focused `Enter` keydown flipped `aria-expanded` off
  `false`. Radix `Switch` and plain form submits worked fine in the same
  tab (hydration confirmed via `__reactProps$`), so this is specific to
  `Select`'s pointer-capture behavior in a non-composited pane, not a
  hydration stall. When a `Select`'s *value* is what needs proving, test
  the underlying pure logic directly instead (as was done for
  `resolvePublishedAt`) rather than burning time on the widget —
  `SelectField` itself is already-proven Phase 20 infrastructure.

### Phase 22 — SEO, social sharing, structured data, and a semantic HTML audit

The goal was concrete and non-abstract: a recruiter pastes a project link
into LinkedIn or WhatsApp, and the preview has to look deliberate. That
drove every decision below.

**New files:** `lib/seo.ts` (origin, canonical rules, `buildPageMetadata`),
`lib/jsonLd.ts` (schema.org builders), `components/seo/JsonLd.tsx` (+ its
README), `lib/data/sitemap.ts`, `app/sitemap.ts`, `app/robots.ts`,
`app/(site)/projects/[slug]/opengraph-image.tsx`, and
`app/(site)/projects/[slug]/twitter-image.tsx`. Full reference material is
in [docs/architecture.md](./architecture.md)'s new "SEO & social sharing"
section — this entry covers what was learned, not what was built.

**The one architectural decision worth remembering:** every route's
`generateMetadata` goes through `buildPageMetadata` rather than assembling
`openGraph`/`twitter` by hand. Next merges `Metadata` root-to-leaf, but it
**replaces the `openGraph` and `twitter` objects wholesale** on override
rather than merging field by field — so a page that sets only
`openGraph.title` silently drops the layout's image, `url`, and
`site_name`. That failure is completely invisible locally; it shows up as a
broken preview in someone else's chat window, days later. One builder makes
it structurally impossible.

The title template lives in `app/(site)/layout.tsx`, not the root layout,
because it's driven by `site_settings`/`profile` and means nothing for
`/admin` (which has its own). The homepage passes `title.absolute` because
`site_title` already contains the name — without it, the tab reads "Syed
Asif — Analytics & ML Engineer | Syed Asif".

**Four things that had to be discovered by running them, not by reading
docs:**

1. **Route segment config cannot be re-exported.** `twitter-image.tsx`
   re-exports the OG card module so the two images can never drift, and
   re-exporting `revalidate` along with it **fails the build outright**
   ("Next.js can't recognize the exported `revalidate` field in route. It
   mustn't be reexported"). Segment config is parsed statically out of the
   source, so it has to be declared literally in each file.
   `generateStaticParams`, `generateImageMetadata`, `size` and
   `contentType` all re-export fine — it is specifically the segment-config
   fields that don't.
2. **`generateImageMetadata` wants `size: { width, height }`, nested.**
   Spreading flat `width`/`height` keys onto the returned object compiles,
   type-checks, and produces **no `og:image:width`/`og:image:height` tags
   at all** — silently. Caught only by reading the actual served `<head>`,
   which is the general lesson: metadata bugs don't throw.
3. **The generated card's URL cannot be reconstructed by hand.** Next
   serves it from `/projects/<slug>/opengraph-image-<hash>/card?<hash>`;
   the un-hashed `/projects/<slug>/opengraph-image` path **404s**, verified
   directly with curl. The project's JSON-LD `image` initially pointed at
   that un-hashed path — structured data advertising a dead image. It now
   uses the project's own `cover_image_url`/`logo_url`, which are real
   resolvable assets. If a future phase needs the card's URL in a non-`<head>`
   context, it has to come out of Next's own metadata, not be built by
   string concatenation.
4. **Satori will take the whole card down over a missing backdrop.** Handed
   a 404 HTML body as an image it throws, so the card's background image is
   **`HEAD`-probed before use** and degrades to no backdrop rather than to
   no card. This is not hypothetical here: every asset path in
   `supabase/seed.sql` is a placeholder that was never uploaded, so the
   probe rejects them on every local render and the fallback path is the
   one actually exercised today. SVG is excluded from the probe too —
   satori's SVG support is partial enough to render an empty box.

**Design tokens in the OG card.** Satori renders without a browser, so it
can resolve neither Tailwind utilities nor CSS custom properties. The card
therefore needs literal hex values, collected into one `OG_COLORS` constant
that mirrors `styles/tokens.css`. This is the **only** sanctioned
duplication of a token value in the codebase (CLAUDE.md's rule 4 exists to
stop one-off literals appearing inside components; here there is no
alternative) — if a colour token changes, that constant is the one place
that has to follow.

**Semantic HTML audit.** Run against the actual served markup of all five
public routes with a script that counted landmarks, built the heading
outline, and flagged unnamed sections, missing `alt`, and generic link
text — not by reading components. Five real findings, all fixed:

1. **`/styleguide` rendered a second `<main>`** nested inside the site
   layout's — invalid HTML, and two "main" landmarks for assistive tech to
   choose between. Now a `<div>`.
2. **`/projects` skipped a heading level**: `h1` "All Projects" straight to
   the cards' `h3`, because unlike the homepage's Projects section there's
   no `h2` in between. `ProjectCard` now takes a `headingLevel` prop (the
   index passes 2, the homepage keeps 3) — only the tag changes, the visual
   treatment is identical.
3. **`/resume/unavailable` and `/projects/*` not-found had no `h1` at
   all** — their entire content is an `EmptyState`, whose title was a `<p>`.
   `EmptyState` now takes `titleAs`, defaulting to `"p"` (correct when it
   sits inside a section that already has a heading) and set to `"h1"` on
   those two dead-end pages.
4. **Every `<section>` was anonymous.** `Section` gained `labelledBy` and
   `SectionHeading` gained `headingId`; all nine homepage sections, the
   project detail page's blocks, and `StyleguideSection` now name
   themselves, so a landmark list reads "Projects" instead of "region".
5. **Two link labels didn't say where they went** — "GitHub" and "Live
   Demo" are now "View source on GitHub" and "Open live demo", and the
   prev/next project links carry an `sr-only` "Previous project:" prefix.

Structure on the detail page also changed: the project is now an
`<article>`, with the prev/next links as a `<nav>` **outside** it (they're
about other projects, not this one).

**Two things the audit checked and found already correct**, worth recording
so they don't get "fixed" later: every `alt=""` on the public site is
deliberate and paired with an accessible name on the wrapper (a gallery
thumbnail sits inside a button already labelled "Open Screenshot 3";
`Avatar`/`ProjectCardImage` fallbacks use `role="img"` + `aria-label`), and
`lib/media.ts`'s `resolveMediaLabel` already prefers the admin-authored
`alt_text` over everything else. Adding `alt` text to those images would
cause double announcement, not improve anything.

**Verified, and how:**

- `next build` clean; the route table shows `sitemap.xml`, `robots.txt`,
  the OG card and the Twitter card all prerendered (`●`/`○`), one card per
  published slug.
- `robots.txt` and `sitemap.xml` fetched from a real production server
  (`npm run build && npm run start`): correct disallows, and `lastmod`
  values that match the real `updated_at` in Postgres.
- The generated card fetched and **looked at**: 1200×630, 58 KB PNG,
  correct tokens, project name, description, brand line and tech pill.
  `x-nextjs-cache: HIT` on the response — proof it is served from the cache
  rather than regenerated per request.
- Every `<meta>` tag on all three public routes read out of the served
  `<head>` — titles, descriptions, canonicals, full OG and Twitter sets.
- **Structured data validated at validator.schema.org: 0 errors, 0 warnings**
  on both the homepage graph (Person + WebSite) and the project graph
  (SoftwareSourceCode + BreadcrumbList).
- The 404 page's single `h1` confirmed in the **live DOM**, not the HTML —
  `notFound()` thrown from a dynamic segment streams the not-found UI in the
  RSC payload *after* the shell is flushed, so a regex over the raw HTML
  reports zero `<h1>` even though the rendered page has exactly one. Check
  the DOM, not the HTML string, for anything below a `notFound()`.

**What could not be verified, and why** (stated plainly rather than papered
over):

- **Google's Rich Results Test** is gated behind reCAPTCHA (confirmed: a
  live `recaptcha/api2/anchor` frame on the page), and its tab UI doesn't
  respond in the non-displayed Browser pane. Solving it is off-limits, so
  this one is left for the user to run by pasting the same snippet, or
  against the real URL once deployed. Note that of the types used here only
  `BreadcrumbList` is a Google rich-result feature at all — `Person`,
  `WebSite`, `CreativeWork` and `SoftwareSourceCode` are understood but not
  reported as rich results, so a "no items detected" on the homepage would
  be expected, not a failure.
- **External Open Graph / Twitter card validators** all fetch a public URL.
  There isn't one yet — the site is undeployed and `NEXT_PUBLIC_SITE_URL`
  is still `http://localhost:3000`, which also means every canonical and OG
  URL currently resolves to localhost. Both fix themselves the moment the
  site is deployed with a real origin; until then the tags were verified by
  reading the served markup directly.

### Phase 23 — Resilience: error pages, loading states, empty states, and failure handling

The instruction that shaped this phase was "test the failure cases
deliberately — do not just read the code and assume." Doing that is what
turned it from a page-writing exercise into a bug hunt: **five real
defects, none of which were visible in the source.**

Reference material is in [docs/architecture.md](./architecture.md)'s new
"Resilience" section and the whole of
[docs/empty-states.md](./empty-states.md). This entry is what was learned.

**The five defects, all found by breaking something on purpose:**

1. **An unreachable database was indistinguishable from empty content.**
   Every `lib/data` read swallowed its error and returned `null`/`[]`. With
   `NEXT_PUBLIC_SUPABASE_URL` pointed at a dead port the homepage rendered a
   hollow shell, `/projects` claimed "No projects yet. Published projects
   will show up here once they're added," and `/projects/[slug]` returned a
   blank 404 for a real project. Worse, those empty values were returned
   from inside `unstable_cache` and so were **cached for an hour**. Fixed by
   classifying connectivity-class errors in `lib/data/shared.ts` and
   throwing `DataUnavailableError`, with `tolerateUnavailable` opting out
   the few callers that must not fail (chrome, metadata, sitemap, OG image,
   `generateStaticParams`).

2. **`error.tsx` does not cover statically generated pages.** The big one.
   `app/(site)/error.tsx` handled the outage perfectly in dev and on every
   dynamic route — `/admin` rendered its boundary cleanly with PostgREST
   stopped. But an unbuilt slug on an ISR route is generated at request
   time as *cacheable static output*, and a throw there never reaches a
   React error boundary: production returned bare "Internal Server Error"
   text, the exact thing this phase existed to eliminate. **This was only
   visible in a production build** — dev never showed it. Fixed by having
   the three statically generated pages catch `DataUnavailableError`
   themselves and return `<ContentUnavailable />`, a Server Component.

3. **`connection()` cannot rescue an in-flight static render.** The obvious
   way to keep an outage response out of the route cache. It throws
   `DYNAMIC_SERVER_USAGE` instead, which Next converts straight back into
   the bare 500 — so the "fix" reproduced the bug it was meant to solve.
   Removed. The accepted trade (a degraded page may be cached for up to
   `revalidate`) was then **verified rather than assumed**: requesting the
   same slug after recovery still served the degraded page, while a fresh
   slug behaved normally.

4. **The middleware turned a database outage into an unparseable Server
   Action response.** `updateSession` discarded the error from
   `getUser()` and treated any failure as "signed out", so during an outage
   it redirected the *Server Action's own POST* to `/admin/login`. React
   can't interpret an HTML redirect as an action result: the page threw "An
   unexpected response was received from the server" as an unhandled
   rejection, and the optimistic row sat flipped with no toast, forever.
   Found by stopping the Postgres container and clicking a publish toggle.
   Fixed by passing connectivity failures through to layer 2 — which costs
   nothing, since the protected layout and every Server Action re-check, and
   RLS is the real boundary.

5. **Admin auth answered every failure with "you must be signed in."**
   Including "the database is unreachable", which sends an admin off
   re-authenticating a session that was never the problem — to a login page
   backed by the same Postgres. `resolveAdminAuth` now returns a three-way
   result (`authenticated` / `unauthenticated` / `unavailable`) while still
   merging "no session" and "not the admin" into one indistinguishable
   outcome, so nothing leaks about which accounts exist.

**A false finding I caught before reporting it**, worth recording because
the failure mode is subtle: after a successful upload the image preview
appeared broken (`complete: true, naturalWidth: 0`), which looked like a
real bug — the preview keeps a blob URL that `finally` has already revoked.
It wasn't. The test file was 8 MB of near-zero bytes with a PNG magic
header, which no decoder can render *regardless* of blob revocation.
Re-tested with a genuine `canvas.toBlob()` PNG: `naturalWidth: 400`, fine.
**When testing image behaviour, generate a real decodable image** — a
plausible-looking fake byte array produces a broken image for reasons that
have nothing to do with the code under test.

**Upload progress is real now.** `@supabase/storage-js` uploads via
`fetch`, which has no upload-progress event — that's why the uploaders had
an indeterminate spinner. `uploadFile` moved to `XMLHttpRequest` against
the same `POST /storage/v1/object/{bucket}/{path}` endpoint with the same
bearer token, so RLS applies identically; it's a different transport for
the same call, not a different privilege path. Verified with an 8 MB
upload: progress sampled at 0 → 16 → 22 → 61 → 100, and the object landed
in Storage at the right size.

**The empty-state audit was run against the real database, not read out of
the components.** Three batches, each restarting the dev server with a cold
`.next` (a stale `unstable_cache` entry survives deleting `.next/cache` —
re-confirmed, matching Phase 7): a bare-minimum project, every optional
field null with rows still published, and nothing published anywhere. The
middle batch is the one that proves "no stray punctuation, bullets or
gaps": scanning for empty `<li>`/`<p>`/`<h*>`, doubled or dangling `·`
separators, and literal `null`/`undefined` strings returned **zero hits**.
Every table was backed up to an `audit_backup` schema first and restored
after, with a row-by-row `EXCEPT` comparison confirming the restore was
exact.

**Two testing gotchas that cost real time:**

- **`NEXT_PUBLIC_*` variables are inlined at build time.** The brief's
  suggested test — point the env var at an invalid URL — works in `next
  dev` (which reads `process.env` live) but has **no effect on a production
  server**, which keeps the value baked in at build. A prod outage test has
  to stop the actual containers (`docker stop supabase_rest_… supabase_kong_…`)
  or rebuild with the bad value. Half an hour went into a "passing" prod
  test that was quietly still talking to a healthy database.
- **Regex-scanning HTML for `<button ... disabled` matches Tailwind's
  `disabled:` variant classes.** It reported disabled buttons on a page
  that had none. Assert on the rendered control, not on a substring of the
  class attribute.

**What was verified, and how:**

- Every error page rendered live: root 404, project 404, the site degraded
  state, the admin boundary. All carry an h1 and at least two routes back.
- **No leakage in production**: with the stack down, the degraded page
  showed no `<pre>`, no message, no Supabase/Postgres string — only a
  reference code — while the full error, stack and cause were in the
  server log.
- Loading states observed on real navigations: `Loading project` for the
  detail route, and five distinct section skeletons streaming
  independently on the homepage.
- Optimistic rollback verified by stopping Postgres with the admin list
  open: toggle flipped, action failed, toggle reverted, actionable toast.
- Upload failure verified by stopping the Storage container mid-flight:
  "File storage is having a problem right now. Nothing was uploaded — try
  again in a moment," and the preview rolled back rather than showing a
  picture that wasn't stored.
- `next build` clean, ESLint clean, and the route table unchanged — `/`,
  `/projects` and the project page are all still prerendered, so the new
  route groups and guards cost nothing at build time.

**Environment note:** the database and Storage are back to exactly
`supabase/seed.sql`'s content (verified with `EXCEPT`), the `audit_backup`
schema has been dropped, all test uploads were deleted through the Storage
API (direct `DELETE` on `storage.objects` is blocked by a trigger), and all
five Supabase containers plus the local admin account are healthy.

### Phase 24 — Verify and harden: DONE

Measurement-first phase. Every number below was produced by running
something, not by reading code; where a number could not be produced
honestly, that is stated rather than estimated.

**Tooling now wired up** (`package.json`): `npm test` (Vitest, 52 tests),
`npm run test:e2e` (Playwright, 33 tests × Chrome and Edge),
`npm run test:e2e:edge`. Playwright drives the *installed* Chrome/Edge via
`channel`, so no ~300MB browser download. `playwright.config.ts`,
`vitest.config.ts` and `tests/setup.ts` are new.

#### Part A — Accessibility

**axe-core, 5 pages, before → after: 3 violation types / 9 nodes → 0 / 0.**
Run by injecting the installed `axe.min.js` into a real authenticated
browser session, which is what made the admin pages measurable at all.

| Page | Before | After |
| --- | --- | --- |
| `/` | 2 types (label-content-name-mismatch ×2, color-contrast ×1) | **0** |
| `/projects/[slug]` | 0 | **0** |
| `/admin` | 0 | **0** |
| `/admin/projects` | 0 | **0** |
| `/admin/projects/new` | 2 types (color-contrast ×4, label ×2) | **0** |

Lighthouse accessibility score, homepage mobile: **96 → 100**.

Five real defects, each found by measurement:

1. **`label-content-name-mismatch` (WCAG 2.5.3)** on ProjectCard and every
   contact card. Both carried a deliberate `aria-label` that *replaced* the
   visible text, which breaks voice control. Fixed with `aria-labelledby`
   pointing at the card's own visible title.
2. **Status pills failed contrast over the hero background effect.**
   `bg-success/15` is translucent, so the hero's chartreuse glow blob lifted
   the effective backdrop from `#0a0d18` to `#425e39` and dropped the text
   to **4.16:1**. Translucent status colours cannot be contrast-checked in
   isolation, so they are gone: `--color-{success,warning,danger,info,accent}-surface`
   are opaque tokens composited to the exact previous appearance. Every
   pairing now passes (5.28–11.30:1).
3. **`--color-foreground-muted` failed AA on `--color-surface-raised`**
   (4.38:1). It passed on the other two surfaces, which is why it survived
   this long; the admin panel hits the failing one because shadcn's inactive
   Tabs triggers are `text-muted-foreground` on a raised surface. Raised
   `#7d84a0` → `#8087a3`, the smallest change clearing 4.5:1 on the
   lightest surface it is used on (now 5.46 / 5.00 / 4.56).
4. **Three `sr-only` file inputs were focusable and unlabelled** — a
   phantom tab stop plus a critical `label` violation. They are programmatic
   triggers behind a visible button, so they are now `tabIndex={-1}` +
   `aria-hidden`.
5. **`SlugField`'s input had no `id`.** `FormControl` (a Radix `Slot`) hands
   `id`/`aria-describedby`/`aria-invalid` to `SlugControl` as React props,
   and it dropped them, so `<FormLabel for=...>` pointed at nothing. Now
   forwarded. Its availability state also only ever changed an icon, which
   announces nothing — added an `aria-live="polite"` region.

**Keyboard pass** (`tests/e2e/keyboard.spec.ts`, 4 tests): every focusable
control on the homepage tab-reachable with a visible indicator; skip link is
the first stop; mobile menu traps focus for 15 consecutive tabs and Escape
closes it; admin form fields and the WAI-ARIA tabs arrow-key pattern work.
Two defects fixed:

- **The skip link had no focus ring at all** (`focus-visible:outline-none`,
  no replacement) — the very first thing a keyboard user lands on.
- **The mobile menu overlay collapsed to zero height.** Opening it sets
  `isElevated`, which adds `backdrop-blur-md` to `<header>`; `backdrop-filter`
  makes an element a *containing block* for `position: fixed` descendants, so
  the overlay resolved `top: 80px; bottom: 0` against the 81px header instead
  of the viewport. Confirmed by forcing the header's `backdrop-filter` to
  `none` in the live page: height went **0px → 764px**. Easy to miss by eye
  because the links still paint — they overflow — but they were laid out from
  y=63, i.e. the first one sat *underneath* the fixed header and could not be
  tapped, and the dimmed backdrop covered nothing. Fixed by rendering the
  overlay as a sibling of `<header>` rather than a child.

**Nothing is hover-only.** Public-site hover zooms already paired
`group-focus-visible`. Three admin controls did not — ImageUploader's
Replace/Remove overlay and MultiImageUploader's drag/remove buttons were
`opacity-0` until hover while remaining focusable, and unreachable on touch.
All now also respond to `focus-within`/`focus-visible`.

**Reduced motion** (`tests/e2e/reveal-opacity.spec.ts`): asserts, by reading
computed `animationName` on every element with the setting on, that **no
animation is declared anywhere** — plus a mirror test that they *are*
declared when motion is allowed, so the first test cannot pass by deletion.
Found one real violation: **`Skeleton` used a bare `animate-pulse`**, so
every loading placeholder pulsed indefinitely regardless of the setting —
and a failed image (the seeded avatar placeholder, which does not exist)
leaves it pulsing forever. Now `motion-safe:animate-pulse`.

#### Part B — Performance

Lighthouse, production build, median of **3 runs** per cell.

| | perf | LCP | FCP | CLS | TBT | Speed Index | script |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home mobile — before | 86 | 3723ms | 961ms | 0.000 | 195ms | 2209ms | 234KB |
| Home mobile — **after** | **91** | **3340ms** | 917ms | 0.000 | **147ms** | **917ms** | **221KB** |
| Home desktop — before | 100 | 713ms | 263ms | 0.000 | 3ms | 271ms | 234KB |
| Home desktop — **after** | **100** | **695ms** | 257ms | 0.000 | 6ms | 291ms | **221KB** |
| Project mobile — before | 89 | 3435ms | 769ms | 0.000 | 178ms | 2048ms | 241KB |
| Project mobile — **after** | **95** | **2999ms** | 920ms | 0.000 | **72ms** | **920ms** | **227KB** |
| Project desktop — before | 100 | 640ms | 221ms | 0.000 | 0ms | 230ms | 241KB |
| Project desktop — **after** | **100** | **654ms** | 253ms | 0.000 | 0ms | 253ms | **227KB** |

Against the stated targets: **CLS < 0.1 met** (0.000 everywhere),
**desktop 90+ met** (100), **mobile 80+ met** (91 / 95), **homepage mobile
LCP < 2.5s NOT met** (3340ms). See "known defects" below.

**INP is not reported, because Lighthouse cannot produce it** — it is a
field metric and lab runs have no interactions to measure. TBT is the lab
proxy and is in the table.

**The root cause, and what actually fixed it.** The public site's entire
section tree was `"use client"` for one reason: Framer Motion's
`revealOnScroll`/`staggerContainer`. None of those components had any
interactivity. Measured on a 4×-CPU-throttled mobile profile with real
(not simulated) throttling, the consequence was **a single 4,459ms
main-thread hydration task**, during which the browser could not paint:
first paint landed at 2,912ms with JS enabled versus ~1,633ms with it
disabled. So the entrance animation moved to CSS (`.reveal` /
`.reveal-group` / `.hero-in-group` / `.hero-blob-*` in
`styles/globals.css`) and these became **Server Components**: `Section`,
`Card`, `HeroReveal`, `HeroBackground`, `AboutContent`, `SkillsContent`,
`ExperienceContent`, `EducationContent`, `AchievementsContent`,
`CertificationGrid`, `ProjectGrid`, `ContactContent`. Framer Motion is
*not* removed — it still drives the mobile menu, page transitions and the
media lightbox, where a real enter/exit lifecycle earns its cost. Only the
fire-and-forget "fade in as it scrolls past" moved.

Result on the same probe: **largest main-thread task 4,459ms → 2,619ms**,
and once the host was quiet, **185ms**.

Two things this uncovered that are worth remembering:

- **`animation-timeline: view()` is scroll-*linked*, not scroll-*triggered*.**
  Unlike `whileInView` + `once: true`, progress tracks scroll position
  continuously, so an element can *rest* mid-fade. With a percentage range
  (`entry 0% cover 30%`) a section taller than the viewport sat at ~0.63
  opacity indefinitely — Lighthouse flagged it as a contrast failure
  (2.15:1 on the About heading) and it was a genuine one. A *length* offset
  (`entry 0% entry 100px`) is bounded and element-height-independent.
  `tests/e2e/reveal-opacity.spec.ts` now scrolls the real page and asserts
  computed opacity, because the whole class of bug is invisible in source.
- **Scroll-driven timelines are not free on mobile.** A/B-ing the same build
  on a 4×-throttled profile, twice: total long-task time ~4,795ms with the
  reveals on versus ~3,780ms off. They are therefore gated to
  `min-width: 768px`; below that content is simply visible. The hero's own
  entrance is time-based, costs nothing measurable, and is not gated.

**Other Part B findings:**

- **`duration-fast` / `duration-base` and friends generated no CSS at all.**
  The `--duration-*` tokens existed in `tokens.css` from Phase 5 but were
  never exported into `@theme`, so **20 usages** across Navbar, Footer,
  AdminSidebar, MediaThumbnail and others were silently inert — every one of
  those transitions was instant. Found by grepping the *built* stylesheet
  for the utility rather than trusting that a class in a component means a
  rule exists. Now exported.
- **Images:** all six `next/image` usages already carry `sizes`. The
  `w=1200` fetch on a 412px viewport is *correct* for DPR 2.625, not a bug.
- **Fonts:** self-hosted by `next/font` (no Google Fonts request), subset
  via `unicode-range` with only the latin subset preloaded,
  `font-display: swap`, `crossorigin` set. Nothing to change.
- **Third-party scripts: none.** The only external URLs in the markup are
  content links (a Credly badge, `example.com` seed data).
- **Database (item 10).** No N+1: every child relation is fetched with
  PostgREST embedding in a single round trip (`project_technologies`,
  `project_features`, `project_media`, `skills`). Caching verified with
  `pg_stat_statements` **and a control**: one direct PostgREST query
  incremented the projects-query counter by exactly 1, while **20 cached
  page requests incremented it by 0**. Index usage **could not be verified
  from real query plans** — every content table holds exactly one row, so
  the planner correctly chooses a Seq Scan every time. Forcing
  `enable_seqscan = off` confirms the indexes are applicable and would be
  chosen (`projects_display_order_idx`, `projects_slug_key`,
  `project_media_project_display_order_idx`, `skills_display_order_idx`).
  That is the strongest claim the current data volume supports; it is not
  the same as "the indexes are used in production".
- **`lib/supabase/admin.ts` (service-role client) does not work and nothing
  imports it.** The JWT correctly carries `role: service_role`, but no
  migration ever issued `GRANT ... TO service_role`, so PostgREST answers
  `42501 permission denied for table projects`. Latent, not live — found by
  trying to use it for test fixtures. The tests authenticate as the admin
  instead, which exercises the real RLS path anyway.

#### Part C — Testing

**Vitest — 52 tests, all passing.** Zod edge cases (slug format, the
`optionalUrlSchema` vs `optionalAssetUrlSchema` distinction that has bitten
this repo twice, publish-gate refinements, date ordering, the WhatsApp
digit-count validator including a punctuated US number, file size/MIME
bounds) and the data-access layer asserted against the **real** local
Supabase stack: an unpublished fixture project must not appear in
`fetchProjects`, `fetchProjectSlugs` or `fetchProjectBySlug`, and every row
those return must be `published` in the database. A mocked client would pass
whether or not the filter existed, so it is deliberately not mocked.

**Playwright — 33 tests, passing in both Chrome and Edge.** Admin login
(including a wrong password and an unauthenticated redirect), project
create/edit/delete, publish/unpublish, slug uniqueness, real file upload to
Supabase Storage, draft-mode preview, both critical journeys, the keyboard
pass, reduced motion, and responsive.

**Responsive:** 360 / 390 / 768 / 1024 / 1440 / 1920 px × 11 routes
(5 public + 6 admin), **66 full-page screenshots per browser** in
`test-results/responsive/<browser>/` (gitignored). The assertion that
actually fails the build is **no horizontal overflow**, checked by comparing
`documentElement.scrollWidth` to the viewport and naming the widest
offending element. **No overflow at any width on any route.**

**Cross-browser:** identical results in Chrome and Edge — 33/33 both, no
behavioural differences observed. **Safari was not tested**: this is a
Windows host and WebKit is not available. Worth noting one real exposure
that leaves: the CSS scroll-driven reveals are `@supports`-guarded, so
Safari simply shows content without animating — that path is reasoned about
but unverified.

**Three test-harness traps worth not re-learning:**

- `.first()` on a row control in the admin list is **not** row-scoped. An
  early version of the publish test matched the seeded
  `customer-churn-prediction` row and really did unpublish real content
  (restored immediately). The tests now filter with the screen's own search
  box first. (`getByRole("row")` is unavailable — AdminTable renders a CSS
  grid, not a semantic `<table>`.)
- **`page.goto` and `page.request` share the browser context's HTTP cache**,
  and the project route is served `stale-while-revalidate=31532400`. Polling
  with either kept returning an unpublished project's content long after the
  server had stopped serving it. Playwright's test-scoped `request` fixture
  has its own cache and is what the assertions use. (The underlying fact is
  real and worth knowing: a visitor who already loaded a project page can
  keep seeing it from their own cache after it is unpublished.)
- **Renaming a project moves its slug**, because `SlugField` re-derives the
  slug from the name until the slug is hand-edited. Tests key on the row id.

#### Known defects found and deliberately NOT fixed

1. **Homepage mobile LCP is 3,340ms against a 2,500ms target.** Improved
   from 3,723ms but short. It is now bandwidth-bound, not CPU-bound: the
   *observed* LCP breakdown is 11ms TTFB + 160ms element render delay, and
   the 3,340ms is Lighthouse's Lantern simulation of slow-4G over 374KB.
   The only remaining lever big enough to close an ~840ms gap is removing
   Framer Motion from the public bundle (40KB transferred, **73% unused**,
   still loaded for the mobile menu, page transitions and lightbox).
   That contradicts CLAUDE.md's fixed stack, so it is an owner decision
   rather than something to do unilaterally.
2. **`notFound()` in `/projects/[slug]` responds HTTP 200, not 404** — a
   soft-404. Unrelated to publishing state and unrelated to Phase 23's
   try/catch (the `notFound()` call sits outside it): `/totally-unknown-route`
   correctly 404s, while `/projects/never-existed` returns 200. Next still
   injects `<meta name="robots" content="noindex">` and no project content is
   served. `dynamicParams = false` would fix the status but was rejected —
   `generateStaticParams` runs only at build time, so every newly added
   project would 404 until a redeploy, breaking the "adding a project is a
   database row, not a deploy" principle.
3. **`PageTransition` briefly duplicates DOM ids and `<h1>`.**
   AnimatePresence's default sync mode keeps the outgoing and incoming pages
   mounted together; measured at **~113ms, up to 2 `<h1>` and 7 duplicated
   `id`s**. `<main>` is not duplicated and it settles clean. Transient but
   real (duplicate ids are invalid HTML, and `aria-labelledby` can resolve to
   the wrong element in that window). The fix is a trade-off — `mode="wait"`
   costs ~150ms on every navigation, or the exiting page must be marked
   `inert` — so it is recorded rather than chosen.

#### How to reproduce these measurements

The *tests* are committed (`tests/`, `vitest.config.ts`,
`playwright.config.ts`). The **ad-hoc measurement scripts were not** — they
lived in a scratch directory and are gone. They are all small, and this is
what they did, so a future session can rebuild any of them in a few minutes
rather than re-deriving the approach:

- **Lighthouse**, always against `npm run build && npm run start`, never
  `next dev`, and always a 3-run median because single runs on this host
  vary widely:
  ```bash
  npx lighthouse http://localhost:3000/ --quiet --output=json \
    --output-path=out.json --only-categories=performance,accessibility \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu" [--preset=desktop]
  ```
  Omit `--preset=desktop` for the mobile profile (which applies 4x CPU +
  slow-4G *simulated* throttling). Note the CLI exits with a Windows
  chrome-launcher `kill` stack trace *after* writing the report — the file
  is fine; don't read that as a failure.
- **axe-core on authenticated pages**: launch Playwright with
  `channel: "chrome"`, log in through the real form, then
  `page.evaluate(readFileSync("node_modules/axe-core/axe.min.js"))` followed
  by `await window.axe.run(document, { resultTypes: ["violations"] })`.
  This is the only way `/admin/*` gets audited at all. Audit at more than one
  width — Lighthouse's 412px mobile viewport caught a contrast failure the
  1280px axe run did not.
- **Real (not simulated) throttling**, which is what found the hydration
  task: a Playwright CDP session with
  `Emulation.setCPUThrottlingRate {rate: 4}` plus
  `Network.emulateNetworkConditions` at 1.6Mbps/150ms, then a
  `PerformanceObserver` on `longtask` and `largest-contentful-paint`.
  Lighthouse's mobile LCP is a Lantern *projection*; this is a measurement.
- **Contrast**: walk the DOM reading computed `color`/`background-color` and
  apply the WCAG formula, or compute token pairs directly. Both were used —
  the token matrix found the `foreground-muted` failure, the live DOM found
  the hero-glow one.
- **Cache hits**: `pg_stat_statements`, and **always with a control**. The
  first attempt counted PostgREST container log lines, saw zero, and would
  have "proved" the cache worked — except a deliberate direct query also
  produced zero lines, because PostgREST isn't request-logging at that level.
  The control is what made the real measurement (1 query = +1 call, 20 cached
  page loads = +0) trustworthy.

#### Measurement caveat, stated plainly

This host is memory-constrained (~1GB free of 7.7GB, with Docker, OneDrive
and the repo all resident). A mid-phase Lighthouse batch produced home-mobile
perf 60 / TBT 2,804ms — **not a regression**, but contention: an A/B on the
same build with animations disabled moved together, and once the host was
quiet the same build measured 91 / 147ms. Every number in the tables above
is a 3-run median taken on the quiet host. If a future session sees wildly
worse numbers, check free RAM before believing them.

Two further host notes: `rm -rf .next` followed by a rebuild took **24.9
minutes** because OneDrive re-syncs the whole directory, and a stale ISR
artifact from an E2E test project (`zz-phase24-owner.segments`) caused an
`EPERM: unlink` build failure that only clearing `.next` resolved.

## Recurring lessons worth not re-learning

- **A Tailwind class in a component is not proof a CSS rule exists.** Phase
  24 found `duration-fast`/`duration-base` used in 20 places across Navbar,
  Footer, AdminSidebar and others, generating **no CSS whatsoever**: the
  `--duration-*` tokens lived in `tokens.css` but were never exported into
  `@theme`, so every one of those transitions was silently instant. This is
  the same class of bug as the earlier `text-h2`/`cn()` collision, and the
  same technique catches it — **grep the built stylesheet for the utility**
  (`.next/static/chunks/*.css`), don't infer it from the source.
- **`backdrop-filter` makes an element a containing block for
  `position: fixed` descendants.** The mobile nav overlay was nested inside
  `<header>`, and opening it added `backdrop-blur-md` to that header, so the
  overlay resolved `top/bottom` against the 81px header instead of the
  viewport and computed to **height 0**. The links still painted (they
  overflow), which is exactly why eyeballing missed it for 24 phases — the
  first one just sat underneath the fixed header, untappable. If a `fixed`
  element mysteriously collapses, check every ancestor for `transform`,
  `filter`, `backdrop-filter`, `perspective`, `contain` or `will-change`.
- **`animation-timeline: view()` is scroll-*linked*, not scroll-*triggered*.**
  It is not a drop-in for Framer's `whileInView` + `once: true`: progress
  follows scroll position continuously, so an element can come to *rest*
  part-way through its own fade. A *percentage* offset into `entry` is not a
  fixed distance either — the range spans the element's own height, so a tall
  section can sit at ~0.6 opacity indefinitely. Use a **length** offset
  (`entry 0% entry 100px`) and assert computed opacity in a real browser.
- **Automated a11y tooling must be run against real pages, including
  authenticated ones.** Injecting the installed `axe.min.js` into a
  logged-in Playwright session is what made `/admin/*` measurable at all,
  and three of Phase 24's five axe findings were only on those pages.
  Equally, Lighthouse's mobile viewport caught a contrast failure the
  desktop-width axe run did not — audit at more than one width.
- **On a shared local database, `.first()` on a row control is a live
  hazard.** A Playwright test that clicked the first "Unpublish project"
  switch really did unpublish the seeded project, because every published
  row exposes an identically-named control. Filter to the row first (this
  admin list has its own search box); never let a destructive selector be
  ambiguous.
- **Playwright's `page.goto`/`page.request` share the browser context's HTTP
  cache.** With this project's `stale-while-revalidate=31532400`, polling
  either one returned an unpublished project's content long after the server
  had stopped serving it. Use the test-scoped `request` fixture when
  asserting what the *server* does.
- **Check free RAM before believing a bad performance number.** A mid-phase
  Lighthouse batch on this host reported home-mobile perf 60 / TBT 2,804ms;
  the same build measured 91 / 147ms once the machine was quiet. The tell was
  an A/B whose control arm moved just as much. ~1GB free of 7.7GB, with
  Docker, OneDrive and the repo resident, is enough to invalidate lab timings
  entirely.
- **`rm -rf .next` costs ~25 minutes here**, because OneDrive re-syncs the
  whole directory afterward. Worth avoiding unless actually necessary — but
  it *is* necessary when a stale ISR artifact from a deleted test row causes
  `EPERM: unlink` during a build.

- **`NEXT_PUBLIC_*` env vars are inlined at build time, so overriding one
  at runtime does nothing to a production server.** `next dev` reads
  `process.env` live, so the same override works there — which makes this
  easy to "verify" against dev and then draw a false conclusion about prod.
  To test an outage against a real build, stop the actual containers
  (`docker stop supabase_rest_… supabase_kong_…`) rather than changing the
  URL. Bit Phase 23 for a solid stretch of a "passing" test that was still
  talking to a healthy database.
- **A React `error.tsx` boundary does NOT catch a throw during static/ISR
  generation.** It covers dynamic (`ƒ`) routes only. A page with
  `revalidate` set and `dynamicParams` on generates unbuilt params at
  request time as cacheable static output, and a throw there produces bare
  "Internal Server Error" text with no boundary involved — visible only in
  a production build, never in dev. Statically generated pages have to
  catch their own data-layer failures and return a Server Component
  fallback. And `connection()` cannot rescue that render: it throws
  `DYNAMIC_SERVER_USAGE`, which becomes the same bare 500.
- **Treating "couldn't verify" as "unauthenticated" in middleware breaks
  Server Actions specifically.** Redirecting an action's POST to a login
  page hands React an HTML response it can't parse as an action result —
  the symptom is an "An unexpected response was received from the server"
  unhandled rejection and an optimistic UI stuck mid-update, with no error
  toast. Auth checks want three outcomes (authenticated / unauthenticated /
  unavailable), not two, at every layer.
- **Test image behaviour with a genuinely decodable image.** A byte array
  with a PNG magic header renders as a broken image no matter what the code
  does, which reads exactly like a bug in the component under test. Phase 23
  nearly reported a non-existent blob-revocation bug this way; a real
  `canvas.toBlob()` PNG showed the code was fine.
- **Regex-scanning rendered HTML for `<button ... disabled` matches
  Tailwind's `disabled:` variant class names**, not just the attribute.
  Assert against the rendered control (or `element.disabled`), not a
  substring of `class`.
- **Metadata bugs do not throw.** Phase 22 shipped two that compiled,
  type-checked, and lint-passed while producing silently wrong output:
  `generateImageMetadata` given flat `width`/`height` keys instead of a
  nested `size` object emitted no `og:image:width`/`height` tags at all,
  and a hand-built OG image URL 404'd because Next serves metadata images
  from a hashed path (`/projects/<slug>/opengraph-image-<hash>/card?<hash>`)
  that can't be reconstructed. Neither was visible in the source. **Read the
  actual served `<head>` and curl the actual URLs** — a clean build proves
  nothing about metadata, exactly as it proves nothing about rendering
  (see the tailwind-merge lesson above).
- **Route segment config (`revalidate`, `dynamic`, ...) cannot be
  re-exported from another module** — it's parsed statically out of each
  file's source, and re-exporting it fails the build with "It mustn't be
  reexported". Everything else (`generateStaticParams`,
  `generateImageMetadata`, `size`, `contentType`, `default`) re-exports
  fine, which is what makes the failure surprising.
- **`notFound()` thrown from a dynamic segment streams its UI in the RSC
  payload *after* the HTML shell is flushed.** A regex over the raw HTML
  response reports zero `<h1>` on a 404 page that genuinely renders exactly
  one. For anything below a `notFound()`, assert against the live DOM
  (`document.querySelectorAll`), not the HTML string.
- **Verify against the real thing, not a simulated harness.** Phase 3's
  RLS was "proven" against a hand-rolled Postgres container that happened
  to grant privileges the way I assumed Supabase does by default — wrong
  assumption, masked until Phase 4 tested against genuine `supabase start`.
  Prefer the real local Supabase stack over shortcuts once one is cheap to
  spin up (it now is — see the `--exclude` flags in `supabase/README.md`).
- **A block comment containing a literal `*/` inside a token name (e.g.
  `--duration-*/ --ease-*`) silently truncates the comment and corrupts the
  file.** Bit `lib/motion.ts` once in Phase 5. Watch for this whenever a
  comment mentions a wildcard-suffixed CSS custom property name right
  before a slash.
- **tailwind-merge doesn't know about custom `@theme` namespaces** (our
  font-size scale, and potentially others added later) unless told via
  `extendTailwindMerge` in `lib/utils.ts`. If a future token addition
  introduces a new custom Tailwind utility *prefix* that collides textually
  with a stock group (the way `text-h2` collided with `text-color`), the
  same class of bug can recur — check `cn()`'s config when adding one.
  Actually running the styleguide and reading *computed* styles (not just
  "it compiled") is what catches this class of bug; a clean build is not
  proof of correct rendering.
- **This is a Windows/PowerShell environment.** Background npm/npx
  installs routinely exceed the default tool timeout on first run (image
  pulls, cold caches) — use `run_in_background` and expect to check back
  rather than assume a timeout means failure. Docker Desktop being
  *installed* doesn't mean it's *running* — `supabase start` fails fast
  with a `LegacyDockerLifecycleInspectError` if the daemon isn't up yet;
  launch `Docker Desktop.exe` and wait for `docker info` to succeed first.
- **Never hand-type a "well-known local Supabase demo" anon/service_role
  JWT from memory — verify it against the actual running stack.** See the
  "Where things stand" note above for the exact symptom
  (`PGRST301`/`"None of the keys was able to decode the JWT"`, which reads
  like an RLS bug but isn't one) and the fix (read the real secret out of
  the `supabase_rest_*` container's `PGRST_JWT_SECRET` env var and mint a
  fresh token against it).
- **A stale `unstable_cache` result (e.g. `null` cached during a window
  when Supabase was unreachable) can survive `rm -rf .next/cache` *and* a
  full dev-server process restart** under Next 16 + Turbopack — Phase 7 hit
  this after fixing the JWT above: `getProfile()`/`getSiteSettings()` kept
  returning the old cached `null` while the unwrapped `fetchX()` succeeded
  every time. Only deleting the *entire* `.next` directory (not just
  `.next/cache`) reliably busted it. Reach for this immediately if a
  `lib/data` value looks wrong in dev despite the underlying query
  demonstrably working (verify with a raw `fetchX()` call or `curl` against
  PostgREST directly to confirm it's a cache problem, not a data/RLS one,
  before nuking `.next`).
- **The Browser-pane preview tool needs the user to have actually opened
  the pane to composite frames.** If it hasn't been, `requestAnimationFrame`
  never fires in that tab — this doesn't just block screenshots, it silently
  stalls anything Framer-Motion-driven (`AnimatePresence` exit/unmount,
  scroll-reveal, page transitions) and real `window.scrollTo`/pointer
  coordinates stop working too. Verify animated/interactive logic via DOM
  state, ARIA attributes, and dispatched synthetic events instead of
  pixel-based interaction when this happens — it's an environment
  limitation, not proof of an application bug. **Phase 18 hit this for a
  genuinely extended stretch** (the user needed several prompts/minutes to
  actually display the pane) — `computer{action:"screenshot"}` fails
  outright (not just silently stale) while it's not displayed, which is
  actually a reliable, explicit signal to check for before trusting any
  pixel-coordinate interaction; don't assume a stale screenshot is "close
  enough." Two sub-lessons from getting real interaction working once the
  pane *was* displayed: (1) `element.click()` fires a real `click` event
  but does **not** synthesize the `pointerdown`/`pointermove`/`pointerup`
  sequence real mouse interaction produces — this is invisible for a plain
  `onClick` handler (works fine) but silently no-ops for Radix's
  `DropdownMenu`/similar triggers, which listen for `pointerdown`
  specifically; dispatching a real `PointerEvent('pointerdown', ...)`
  fixed it. (2) `computer{action:"left_click_drag"}`'s single
  down-move-up gesture didn't supply enough intermediate `pointermove`
  events for dnd-kit's `PointerSensor` to register a drag at all (confirmed
  by logging the actual events it dispatched — only 2 moves total); a
  manually-dispatched `PointerEvent` sequence with ~15 intermediate
  `pointermove` steps (small delays between each), targeting the drag
  handle's real `getBoundingClientRect()` coordinates, worked reliably —
  reach for this pattern directly next time a dnd-kit drag needs verifying
  live, rather than re-discovering it.
- **Same root cause, different symptom: `document.visibilityState` is
  `"hidden"` in that tab whenever the pane hasn't been opened, which means
  the Paint Timing API never fires at all** — `performance.getEntriesByType
  ("paint"|"largest-contentful-paint")` comes back empty even long after
  load, not just slow to populate. Confirmed in Phase 8 trying to measure
  the hero's LCP: `tabs_select`-fronting the tab doesn't change it. There is
  currently no way to get a real LCP number from this tool without the user
  opening the pane themselves — say so plainly rather than report a
  fabricated or proxy number (`domContentLoadedEventEnd`/`loadEventEnd` are
  not LCP and shouldn't be presented as if they were).
- **Same root cause, a fourth symptom: React never finishes *hydrating*
  content behind a Suspense boundary while the tab stays hidden** — not
  just paint/RAF/lazy-image loading. Phase 19 hit this hard on
  `/admin/skills`: a bulk-add textarea and every `AdminTable` publish
  Switch were completely inert (typed text updated the raw DOM `.value`
  but React's own `draft` state never budged, so a button reading
  `names.length` stayed stuck at "Add  skills" with an empty count no
  matter what). Confirmed this wasn't new Phase 19 code by checking for
  `__reactProps$` keys directly on the DOM: the root layout's sidebar
  toggle (hydrated synchronously, outside any Suspense boundary) had one;
  a `<Switch>` inside `/admin/education`'s already-shipped, already-Phase-
  18-verified `AdminTable` did not, in the same tab — proving the whole
  class of "streamed-in, Suspense-boundary content" was un-hydrated, not
  something this phase broke. Manually dispatching native `input`/`change`
  events (the classic React-testing workaround) did **not** fix it either
  — hydration itself was stalled, not just the specific event path. The
  only fix was asking the user to actually display the Browser pane; once
  `document.visibilityState` flipped to `"visible"`, hydration completed
  immediately and every control worked normally on the very next
  interaction. Check `__reactProps$` presence on a plain, already-working
  control (or on the exact element that seems inert) before spending time
  debugging "new" component code — if a component from an earlier,
  already-verified phase shows the same missing-props symptom in the same
  tab, it's this, not a regression.
- **Same root cause, a third symptom: default (lazy) `next/image` loads can
  sit for several seconds with zero network request recorded** in this
  hidden/non-composited tab — Phase 9 hit this verifying `AboutPortrait`'s
  broken-image fallback (`/images/avatar.jpg` doesn't exist on disk, so the
  `onError` fallback path is genuinely exercised, not just defensive code).
  A plain `fetch()` from the page confirmed networking itself works fine
  immediately; it's specifically the native lazy-load visibility trigger
  that's stalled. It does eventually resolve on its own — just give it a
  few seconds (or dispatch a synthetic `error` event on the `<img>` to
  verify the handler directly) rather than concluding the fallback is
  broken after one quick check.
- **`resize_window` followed immediately by a `javascript_exec` in the same
  turn can read stale `window.innerWidth`/`innerHeight`** — Phase 10 saw a
  resize to 360×740 report success but the very next check still read
  768×1024 (the *previous* viewport) until re-queried a moment later.
  Re-check `window.innerWidth`/`innerHeight` directly after a resize before
  trusting layout measurements taken right after one, rather than assuming
  a reported "viewport set" means the tab has actually repainted at that
  size yet.
- **`rm -rf .next` can fail with `Device or resource busy` on Windows right
  after `preview_stop`** — Turbopack doesn't always release every file
  handle the instant the process exits. A short pause and retry (or just
  running the same `rm -rf .next` command again) clears it; no need to dig
  further or assume something's actually wrong.
- **The local Supabase stack's excluded-services list (`supabase/README.md`)
  isn't permanent — it reflects what earlier phases happened to need, not a
  hard limit.** Phase 17 needed real Auth for the first time and discovered
  `gotrue` had been excluded since Phase 1; Phase 20 needed real file
  uploads and discovered `storage-api` had been excluded the whole time
  too. `supabase start` with a *different* `--exclude` list does not add
  newly-included services to an already-running stack; only `supabase
  stop` (data preserved unless `--no-backup`) followed by a fresh `start`
  actually creates the missing container. That cycle *can* regenerate the
  JWT signing material (it did in Phase 17) **but doesn't always** — Phase
  20's own stop/start cycle restored from Docker's backup and kept the
  exact same keys. Always re-derive from `npx supabase status -o env`
  after a stop/start cycle and compare against `.env.local` rather than
  assuming either outcome.
- **`event.target.files` on a file `<input>` is a *live* FileList, not a
  snapshot** — capturing it into a variable and *then* resetting
  `event.target.value = ""` (the standard "let the same file be
  re-selected next time" trick) empties the *already-captured* reference
  too, in place, confirmed directly by reading `.length` on the original
  reference after the reset (`0`). A multi-file `onChange` handler that
  captures the FileList container itself, rather than immediately
  extracting the actual `File` objects (`Array.from(event.target.files)`,
  or `files?.[0]` for a single-file input), will silently never process
  anything — no error, no thrown exception, nothing to grep the console
  for. Bit both `MultiImageUploader.tsx` and the new
  `ProjectMediaManager.tsx` in Phase 20; check this first if a file-input
  `onChange` handler seems to just never fire its own logic.
- **React Strict Mode (on by default) double-invokes effects on mount in
  development** — a plain boolean "have I run yet" ref flips to `false`→
  `true` after the *first* of the two simulated mount passes and stays
  `true`, so it no longer guards the *second* pass the way it's meant to.
  If an effect needs to skip only when a *value* genuinely hasn't changed
  (not "is this literally the first time"), track the actual last-seen
  value in the ref and compare against it, not a boolean flag. Bit
  `SlugField.tsx` in Phase 20 — the boolean-flag version looked correct in
  isolated testing and only failed on a second, differently-shaped test
  case (a blank name on an already-saved-slug row).
- **`supabase/seed.sql` seeds every asset column with a root-relative
  placeholder path, and `optionalUrlSchema` (`z.url()`) rejects those.**
  This bug has now been hit *twice* — Phase 19 (Profile, Education) and
  Phase 21 (Certifications ×2, Achievements ×2, Blog, Settings) — because
  Zod validates the whole submitted payload, so a seeded value the admin
  never touched blocks saving anything on that form. **When adding an admin
  form for an entity, grep `supabase/seed.sql` for that table's asset
  columns first**: any column holding an *uploaded* asset (logo, avatar,
  cover image, certificate PDF, supporting document, OG image) wants
  `optionalAssetUrlSchema`, not `optionalUrlSchema`. Genuine external links
  (`link_url`, `github_url`, `credential_url`, `external_link`) correctly
  keep the strict one. Phase 21 found it by reading rather than by hitting
  it — that grep is cheap and catches the whole class at once.
- **Don't hand-roll a format regex when the consumer only needs a
  normalized value.** Phase 21's WhatsApp validator started as one regex
  describing where punctuation may sit, and silently rejected
  `(555) 123-4567` because the character after the optional `+` had to be a
  digit. Validating on *digit count* plus an allowed-character check is both
  simpler and correct, and it mirrors how the value is actually consumed
  (`resolveContactHref` strips every non-digit to build the `wa.me` link).
  More generally: **run a new validator against a table of real inputs
  before trusting it** — the bug was invisible on inspection and obvious
  within one test run.
- **Next.js renamed the `middleware.ts` file convention to `proxy.ts`** in
  the version this project is on (16.3.1) — writing a conventional
  `middleware.ts` still works but logs a runtime deprecation warning.
  `npx @next/codemod@canary middleware-to-proxy .` migrates it correctly
  (renames the file *and* the exported function name, `middleware` →
  `proxy` — easy to half-do by hand) but refuses to run against an
  uncommitted git tree without `--force`, which is safe to pass when the
  change is scoped and you can verify the diff afterward.

## Next up

**The public site is done** (`app/(site)/`, Phases 1–16), **admin
authentication + the protected shell are done** (`app/admin/`, Phase 17),
**the shared admin infrastructure is done and proven** (Phase 18), and
**the admin panel is now complete** (Phases 19–21). Every sidebar
destination is a real editor: Dashboard, Profile, Skills, Experience,
Education, Projects, Certifications, Achievements, Contact, Blog (behind
`blog_enabled`), Resume, Settings. No `ComingSoon` placeholder pages remain.

Proven end to end across those phases: `AdminTable`, `AdminForm` + its nine
field components, `ImageUploader`/`FileUploader`/`ProjectMediaManager`, the
`lib/actions/` Server Action machinery, `SlugField`'s live duplicate-check,
`RepeatableGroupField`, real Next.js draft-mode preview against the actual
public route, and an atomic single-active-resume swap via a Postgres
function.

**Phase 24 added a test suite and hardened both accessibility and
performance** — see its entry above. Anything changed from here on should be
checked with `npm test` and `npm run test:e2e` before it is believed.

What's left:
- **Three known defects Phase 24 found and deliberately did not fix**, each
  because the fix is an owner-level trade-off rather than an oversight:
  homepage mobile LCP (3,340ms vs a 2,500ms target, now bandwidth-bound and
  gated on whether Framer Motion may leave the public bundle); a soft-404
  (`notFound()` in `/projects/[slug]` responds 200); and PageTransition's
  ~113ms window of duplicated DOM ids and `<h1>`s. Full reasoning in the
  Phase 24 entry.
- **Safari is still unverified** — Windows host, no WebKit. The CSS
  scroll-driven reveals are `@supports`-guarded so Safari should simply show
  content unanimated, but that path has been reasoned about, not run.
- **`lib/supabase/admin.ts` is dead and broken** — no migration ever granted
  `service_role` table privileges, so it answers `42501`. Nothing imports it;
  either grant the privileges or delete the file.
- **Deploying, which is now what most of the remaining value is gated on.**
  Phase 22 made this sharper rather than softer: `NEXT_PUBLIC_SITE_URL` is
  still `http://localhost:3000`, so *every* canonical URL, OG URL, sitemap
  entry and JSON-LD `@id` currently points at localhost. They are all
  derived from that one variable (`lib/seo.ts`'s `SITE_URL`) and all become
  correct the moment it points at a real origin — but nothing about the
  social previews can be validated externally until then.
- **A real default OG image.** `site_settings.og_image_url` is seeded as
  `/images/og-cover.png`, a placeholder that doesn't exist, so the homepage
  and `/projects` currently advertise a broken `og:image` and the generated
  project cards fall back to no backdrop. Project pages are unaffected
  otherwise (their card is generated, not uploaded). Uploading one real
  1200x630 image through the admin's Settings screen fixes all of it.
- **Provisioning a real hosted Supabase project** — still only a local
  stack exists (see "Where things stand" above); needed before the site
  can go live, per
  [docs/deployment.md](./deployment.md#admin-account) (a *different*,
  real admin account from Phase 17's local-only test one). **Note the two
  Phase 21 migrations must be applied there too**, and
  `NEXT_PUBLIC_SITE_URL` must point at the real origin for
  `metadataBase`/the resume route to resolve correctly.
- **Real content** (actual project screenshots/resume PDF/portrait/logos) —
  every asset path referenced by `supabase/seed.sql` is still a
  placeholder that doesn't exist in `public/`, by design (see this file's
  Phase 8/9/14/16 notes on that being deliberately exercised, not an
  oversight). This is now the main thing standing between the admin panel
  and a genuinely populated site.
- **A public blog, if and when it's wanted** — the schema, the admin
  module, and the feature flag are all real and proven; the deliberate
  remainder is a public route, a cached read in `lib/data/blogPosts.ts`, a
  `CACHE_TAGS.blog` tag, and the three-place `revalidatePath` treatment
  Projects already models (it's the closest precedent, being the only other
  entity with its own detail route). See content-management.md's
  cache-invalidation table, which spells out exactly what to add.
- **Optional tidying**: `MultiImageUploader` still has no real entity behind
  it (see content-management.md's "Known gaps, by design").
  `components/admin/ComingSoon.tsx` was on this list too and has since been
  deleted.

When the next prompt arrives, update this file's "Where things stand" and
add a new phase-log entry the same way the ones above are written: what got
built, key files touched, and anything non-obvious a future session would
otherwise have to re-discover the hard way.

---

**Phase 25 — launch: security headers, backups, docs, and the release.**
The final phase. What could be done from this machine was done and verified;
what needs Syed's own Vercel, Supabase and registrar accounts is written up
as a runbook in [docs/deployment.md](./deployment.md) rather than guessed at.
**Nothing is deployed yet** — see "What Phase 25 could not do" below, which
is the honest list.

*Pre-deployment checks (all green).* `npm run build` clean, `npx tsc
--noEmit` clean, `npm run lint` zero errors, zero `console.log` in `app/`,
`components/`, `lib/` or `hooks/`, and one non-blocking `TODO` (a download
counter in `app/(site)/resume/route.ts`, deliberately deferred along with
analytics). The git-history secret scan swept **all 26 commits' contents**,
not just the working tree, via `git grep` over `git rev-list --all`; the only
matches were `.env.example`'s `your-service-role-key` placeholder and an npm
integrity hash in `package-lock.json`. `.env.example` is the only env file
ever tracked. As a belt-and-braces check the *built* client bundles were
grepped for the literal service-role key value and for the string
`SERVICE_ROLE`: neither appears.

*Security headers.* CSP plus X-Frame-Options, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control and HSTS, all in
`next.config.ts`'s `headers()`. Reference material — including the full
reasoning for a static CSP over a per-request nonce — is in
[docs/architecture.md](./architecture.md#security-headers-and-csp). Three
things a future session should not re-derive:

- **The nonce was considered and rejected on purpose.** Next can only inject
  a nonce while dynamically rendering, so adopting one disables static
  generation and ISR across the entire public site. What it buys is removing
  `'unsafe-inline'` from `script-src`, and the XSS surface that closes is
  empty here (no visitor-influenced HTML; the single
  `dangerouslySetInnerHTML` is `JsonLd.tsx`'s escaped JSON-LD data block).
  **This calculation changes if the blog ships with Markdown bodies.**
- **`upgrade-insecure-requests` and HSTS are gated on
  `NEXT_PUBLIC_SITE_URL` being `https:`.** Without that gate,
  `upgrade-insecure-requests` rewrites every call to `http://127.0.0.1:54321`
  and breaks the whole local stack. It is the only difference between the
  policy verified locally and the one production serves.
- **The Supabase origin in the CSP and in `images.remotePatterns` come from
  one shared function**, so the two cannot drift apart.

*A real Next 16 behaviour found by testing, not by reading.* `/_next/image`
answered `400 "url" parameter is not allowed` for a Supabase Storage URL. The
cause is **`images.dangerouslyAllowLocalIP`, new in Next 16.0.0 and `false`
by default** — an SSRF guard that refuses to optimize remote images on
local/private IPs, which the local stack (`127.0.0.1:54321`) is. It does not
reproduce in production, where the host is `<ref>.supabase.co`.
`next.config.ts` now enables the flag **only when the configured Supabase
host is itself loopback/private**, so local matches production and production
keeps the guard. Found only by uploading a real file and then requesting its
optimized URL.

*How the CSP was actually verified* (not by reading the header back):
headers confirmed on `/`, a project page, `/admin/login` and `/sitemap.xml`
against a production build; a real 1x1 PNG uploaded through `/admin/profile`
by driving the actual file input, which exercised the `blob:` preview
(`img-src blob:`) and the real `XMLHttpRequest` upload to Storage
(`connect-src`) — `POST ... -> 200 OK`, zero CSP violations in the console;
the resulting Storage URL then loaded both directly and through
`/_next/image`. Then **52 Vitest and 66 Playwright tests (33 x Chrome and
Edge) green under the CSP build**. The test upload was deleted afterwards.

*A nine-phase-old latent bug became live.* `service_role` had **never been
granted anything**. Phase 3 granted `anon` and `authenticated` explicitly (it
had already learned that new tables aren't auto-granted on this stack) but
not `service_role`, and nothing noticed because nothing ever used the
service-role key against a content table — `tests/lib/data/published.test.ts`
had even recorded the gap in a comment during Phase 24 as "latent rather than
live." Phase 25's content-export script is the first thing to genuinely need
it, and got `42501 permission denied for table profile` on its first run.
Fixed by **`supabase/migrations/20260822120000_service_role_grants.sql`**
(the fifth migration), which also sets `alter default privileges` so a future
table cannot repeat it. Applied with a full `npx supabase db reset` — all
five migrations replay cleanly from scratch — and **the local test admin
account was destroyed and recreated as usual** (`test-admin@example.com` /
`Test-Admin-Pass-123!`, verified afterwards: 1 row in `auth.users`, 1 in
`private.admins`).

*Backups — built and proven, not described.* New `scripts/` folder, with its
own README explaining why it is allowed to query Supabase outside `lib/data`
(it is operational tooling, not application code, and a backup wants raw rows
rather than the site's cached, domain-shaped view of them):

- `scripts/export-content.ts` (`npm run backup:content`) — every row of all
  15 tables to timestamped JSON, one file per table plus `all.json` and a
  `manifest.json` carrying the FK-safe `restoreOrder`. Uses the service-role
  key so **drafts are included**; exits non-zero on an empty export.
- `scripts/export-storage.ts` (`npm run backup:storage`) — every object in
  every bucket, paths preserved verbatim. **Buckets are discovered via
  `listBuckets()`, not hardcoded.** The recursive walk is load-bearing:
  Storage's `list()` is directory-shaped, folders come back with `id: null`,
  and every uploader writes to `<record-id>/<uuid>.<ext>` — so a
  non-recursive listing would find *exactly zero files*. Exits non-zero if
  any object fails to download.
- `scripts/lib/backup-env.ts` — shell env wins over an env file, and
  `--env <path>` selects the file, so backing up production never requires
  writing its service-role key to disk. Both scripts take `--dry-run` and
  print the host they are reading from in their first three lines.

Proven by uploading two objects — one at `profile/zz-phase25/one.png`, one
three levels deep at `projects/zz-phase25/nested/deep/two.png` — running the
export, and **SHA-256-comparing the downloaded bytes against the source**
(both matched; the nested path was preserved exactly). The missing-env
failure path was exercised too. All test objects and the `backups/` output
were deleted afterwards; **`storage.objects` is back to 0 rows and the
database matches `seed.sql`** (one row in each of the 15 tables). `backups/`
is git-ignored.

*Documentation.* README.md, docs/deployment.md and docs/development.md were
rewritten from scratch (the latter two were one-line stubs). architecture.md
gained a system diagram, a data-flow section covering the three paths that
matter (public request, admin write, file upload), and the security-headers
section; **its "eight buckets" text was stale and now reads nine** —
`settings` was added in Phase 21 and this file never caught up. database.md
gained the migration list, a full RLS-policies section (including the
GRANT-vs-RLS distinction that caused both of this project's permission bugs)
and a migration-process section. content-management.md gained a
screen-at-a-glance index and an owner-facing backup section. CLAUDE.md's
folder structure now lists `scripts/`. **docs/development.md's FUTURE WORK
section** records the four deliberate deferrals — blog, analytics, project
filtering/search, contact form — each with why it was deferred and what
enabling it would involve.

*What Phase 25 could NOT do, and what remains manual.* Everything requiring
Syed's own accounts. There is still **no hosted Supabase project, no Vercel
project** (`.vercel/` does not exist and the Vercel CLI is not installed)
**and no custom domain**; `npx supabase projects list` fails with
`LegacyPlatformAuthRequiredError` because the CLI is not logged in. Creating
accounts and entering credentials is not something this session can or should
do. So goals 2, 3, 4 and 6 of the phase prompt — Vercel setup, production
Supabase, domain/HTTPS, and the production smoke test — are **written as an
ordered runbook in docs/deployment.md and not executed**. Anything claiming
otherwise would be false. The order in that runbook matters: Supabase must
exist before Vercel can have real env vars, and the domain must exist before
`NEXT_PUBLIC_SITE_URL` can be right.

Two production-only checks are called out there specifically because they
cannot be done from here: **OG card rendering** (needs a public URL — and
note that preview deployments cannot verify it either, since `SITE_URL` falls
back to `localhost`, there being no Vercel-URL fallback in `lib/seo.ts`), and
**re-verifying with the production anon key that no unpublished content is
reachable** (goal 3's last clause — the exact `curl` for it is in the
runbook).

*One thing found in passing.* **[Superseded — see the Phase 25 follow-up
entry at the end of this file. The diagnosis below is wrong: the delete path
was fine, and the real cause was on the *create* path.]** Deleting a project
cascades its `project_media` rows but leaves the underlying Storage objects,
and nothing reaps them. Two separate observations pinned this down: before the `db
reset`, the local `projects` bucket held 10 orphaned objects from earlier
runs; and after the final green E2E run it held exactly 2 more — one per
browser project, because `tests/e2e/owner-journey.spec.ts` uploads a real
file and its `afterAll` deletes the row but not the object. So **every full
`npm run test:e2e` leaks 2 Storage objects locally**, and the same mechanism
applies to a real deletion in production. Cleaned up by hand here
(`storage.objects` is back to 0), and recorded in docs/deployment.md's
"Routine maintenance" and docs/development.md's FUTURE WORK. Not fixed
because the fix belongs in the uploader/delete path, not in a launch phase.

---

**Phase 25 follow-up — the Storage orphan bug, properly diagnosed and fixed.**
The Phase 25 entry above recorded orphaned Storage objects as a known,
unfixed behaviour and blamed the cascade: "deleting a project cascades its
`project_media` rows but leaves the underlying Storage objects." **That
diagnosis was wrong**, and the real cause is worth reading before touching
any `createX` action.

*What was actually happening.* `deleteStorageFolder(bucket, recordId)` has
existed since Phase 18 and every entity's `deleteX` action already called it
— the delete path was fine. The break was on the **create** path. Uploads on
a create form happen before the row exists, so `<Entity>Form` generates a
placeholder id (`useState(() => crypto.randomUUID())`) and uploads to
`{bucket}/{placeholder}/…`. The insert then let Postgres generate its *own*
id via `gen_random_uuid()`, and nothing ever reconciled the two. So the row
owned folder `{bucket}/{realId}/`, which had never held anything, while its
files sat in `{bucket}/{placeholder}/` — referenced by a perfectly valid
`file_url`, rendering perfectly, and unreachable by any delete forever.

**Every record ever created with an image attached before its first save
orphaned that image.** It is invisible from the UI (the picture shows), from
the database (the URL resolves), and from the source (the delete call is
right there). The only way to see it is to count objects in a bucket before
and after a delete.

*The fix.* `resolveNewRecordId`/`withRecordId` in `lib/actions/shared.ts`:
the client's placeholder id is now passed to the create action and inserted
as the row's primary key, so the folder a file was uploaded to *is* the
folder the record owns, from the first byte. That removes the mismatch at
the source rather than reconciling it afterwards — no move step, nothing to
keep in sync, one code path for create and edit. A malformed or absent id
falls back to the column default, so a caller without one still works.

Letting the client pick a primary key is safe here and the helper's comment
says why: the caller is an authenticated admin, RLS independently requires
`is_admin()` on the insert, and a deliberate collision just produces the
unique-violation error every create action already handles.

Seven create actions and their forms now pass it: achievements, blog,
certifications, education, experience, projects, resumes. **`createX` takes
the record id as its first argument** — the same shape `updateX` already had.

*A second, unrelated gap found while auditing.* `deleteBlogPost` never called
`deleteStorageFolder` at all. Blog posts own a cover image and a `blog`
bucket; the call was simply missing. It produced no visible damage only
because the public blog doesn't exist yet, so almost no post has ever been
created, let alone deleted. Fixed.

*A third: the E2E suite was leaking on every run.* `deleteTestProjects()`
deletes rows straight through PostgREST — deliberately, since routing fixture
cleanup through `deleteProject` would make setup depend on an action some
tests assert about — which also means it skips `deleteStorageFolder`. Measured
result: `storage.objects` went 0 → 2 across one full run, one per browser
project. The helper now clears the folder explicitly, reading the ids before
the delete since afterwards there is nothing to look them up by.

*The regression test, and proof it works.* `tests/e2e/storage-cleanup.spec.ts`
covers both orderings (upload during create, which was broken; upload during
edit, which worked and must keep working) and deletes through the **real
admin UI**, not through `deleteTestProjects()` — that helper now sweeps
Storage itself, which would make the assertions pass whether or not
`deleteProject` reclaims anything.

**It was verified to fail against the old code**, not merely to pass against
the new: reverting the one-line insert and rebuilding produced exactly the
right failure — row id `15d69593-…`, file under `e5f058ab-…`. The fix was
then restored and both tests pass.

Two wrong "upload finished" signals were tried first, and the file records
both because both look correct:

1. Waiting for an `img` whose `src` is a Storage URL **never resolves** — an
   `ImageUploader`'s thumbnail stays the local `blob:` preview for the
   component's entire life. (It works in owner-journey.spec.ts only because
   the *gallery* is a different component that does render the real URL.)
2. Waiting for the Replace button — rendered exactly when
   `!isUploading && displayUrl` — resolves **too early**. The test clicked
   Create before `onChange(result.url)` reached react-hook-form, and the
   project saved with a null `logo_url` while the file sat in Storage. That
   failure is indistinguishable from the orphan bug itself, which is exactly
   why it is worth knowing about.

The working signal is the "Image uploaded." toast, emitted on the line
immediately after `onChange`.

*Draining the existing pool.* The fix stops new orphans; it does nothing for
files already stranded, which no delete will ever reach. `npm run
storage:orphans` (`scripts/sweep-orphans.ts`) reports Storage objects that no
content row references, and removes them only with `--delete`. "Orphan" is
decided conservatively and from the content side: it reads **every column of
every table** and stringifies the rows wholesale (so URLs nested in `jsonb`,
like `site_settings.primary_nav`, are caught), then flags an object only if
its `bucket/path` appears nowhere. A file column added later is therefore
covered automatically, and the failure mode of an unknown column is *keeping*
a genuine orphan rather than deleting a live file. Verified both ways
locally: it found and removed real orphans, and reported zero while the
regression test's referenced objects were present.

It stays useful after the fix, for the one case no delete path can catch: an
upload that succeeds and is then abandoned, because the admin replaced the
image before saving or closed a half-filled create form.

*Released as `v1.0.1`.* The fix commit is `0c12dd4` on `develop`, merged to
`main` as `98c20b2` and tagged **`v1.0.1`**, both pushed. `main` and
`develop` are identical again. Upgrading from `v1.0.0` needs no migration and
no config change — but if `v1.0.0` ever ran against a real project, run
`npm run storage:orphans` once to see what it stranded and again with
`--delete` to reclaim it.

*Docs corrected.* content-management.md's "Uploads and storage cleanup" now
describes the primary-key scheme and the bug it replaced;
development.md's FUTURE WORK entry no longer claims deletes leak, and its
gotchas list gained both the `createX(recordId, …)` rule and the
`blob:`-preview trap; deployment.md's "Routine maintenance" points at the
sweep instead of describing an unfixable problem; scripts/README.md documents
the new script.

---

**Deployment — the site is live.** Phase 25 left goals 2, 3, 4 and 6 as an
unexecuted runbook because they need accounts. They have now been executed,
walking the owner through it step by step. Live details (URL, project ref,
region) are recorded in [docs/deployment.md](./deployment.md#the-live-deployment)
so nobody has to dig through a dashboard for them.

Done, in order: hosted Supabase project created and all five migrations
pushed (verified from here — **15/15 tables with RLS**, 29 table policies, 9
buckets, 4 storage policies, `set_active_resume` present, `service_role`
grants working, and **no seed data**, which `db push` correctly does not
run); Vercel connected to `main` with the four env vars; the admin account
created and granted; `NEXT_PUBLIC_SITE_URL` set and verified. `/styleguide`
correctly 404s in production, `robots.txt` disallows the right paths, and all
six security headers are present with `upgrade-insecure-requests` now active
(it and HSTS are `https:`-gated, so they only appear once the site really is
https — exactly as designed).

**Three real problems surfaced, each fixed at the source:**

1. **The first production build failed** with `ERR_INVALID_URL` and
   `Failed to collect page data for /_not-found`. `lib/seo.ts` used
   `process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK`, and **`??` does not fall
   back on `""`** — an env var that exists but is blank (the natural state of
   one added before the domain is known) sailed through into `new URL("")`.
   The error named a route with nothing to do with the cause. Fixed in
   `v1.0.2`: empty, whitespace and unparseable values all degrade to the
   fallback, with a warning for the malformed case. `tests/lib/seo.test.ts`
   covers all six cases; reproduced with a real `next build` before the fix
   and confirmed passing after. 60 unit tests, up from 52.

2. **The admin invite flow cannot work in this app**, and docs/deployment.md
   recommended it. `app/admin/` has exactly one auth route — `login/`, a
   plain password form. There is no auth callback and no set-password page,
   so an invite link has nowhere to land: it redirects to Supabase's Site URL
   (`localhost:3000` by default), burns the token, and reports `otp_expired`.
   **Send password recovery has the same problem.** The doc now warns about
   both and documents *Add user → Create new user* with **Auto Confirm**
   ticked. Worth knowing: password changes for this site happen in the
   Supabase dashboard, not by email. Building a real reset flow (an auth
   callback route plus a set-password page) is a small, genuinely optional
   feature — see FUTURE WORK if it is ever wanted.

3. **`portfolio-ten-brown.vercel.app` belongs to somebody else.** It was
   inferred to be the production alias because it answered HTTP 200, and it
   reached `NEXT_PUBLIC_SITE_URL`, Supabase's Site URL, and one deploy's
   canonical/`og:url` tags before the page *content* was actually read and
   found to be a stranger's portfolio. Corrected to
   `portfolio-ten-brown-24v11dmo3j.vercel.app`, verified by content. **A 200
   from a guessed hostname proves nothing** — read the domain from Vercel's
   Settings → Domains.

Two verification lessons also recorded in deployment.md: polling a fresh
deploy ~40 times in ten minutes trips Vercel's bot protection
(`X-Vercel-Mitigated: challenge`, everything 403s to scripts while browsers
pass transparently), and immediately after a deploy the edge can still serve
the *previous* build's `canonical`/`og:url`/`sitemap.xml` while `robots.txt`
already shows the new ones — indistinguishable from a half-applied env var
until you re-fetch with `{cache: 'reload'}` and a query buster.

**What remains is content, not engineering.** The database is empty, so the
site renders its fallbacks (the tab title reads "Portfolio" from
`DEFAULT_WORDMARK` rather than a name). Everything from here is admin-panel
work: Profile, Settings, Contact, Experience, Education, Skills, Projects,
Resume. The remaining smoke-test items — a published project reachable
publicly, Storage images loading, the resume downloading, an *unpublished*
project provably unreachable, and OG cards rendering — all need real content
before they can mean anything.

---

**Post-launch smoke test, and two defects it found (`v1.0.3`).** Run against
the live site with real content in it (2 projects, profile, active resume, 15
Storage objects). Passing: homepage with real content, both project pages,
the projects index, the resume download (331KB `application/pdf` with the
forced filename), every Storage image URL (200, correct content types), the
generated OG cards (real ~98KB PNGs), JSON-LD (`CreativeWork` /
`SoftwareSourceCode` + `Person` + `BreadcrumbList`), canonical URLs, all six
security headers, and `/definitely-not-a-page` → 404.

**The unpublished-content check passed properly**, tested with a real draft
rather than reasoned about: its own URL 404s, the display name and any `<h1>`
are absent from the HTML, and it appears on neither the index, the homepage,
nor the sitemap. An unpublished slug and a nonexistent one now return
byte-identical responses, so the URL space cannot be probed for hidden work.

**Two defects, both invisible from the code and from the UI:**

1. **`/projects/<unknown>` answered `200`, not `404`** — a soft 404.
   `app/(site)/projects/[slug]/loading.tsx` wrapped the segment in a Suspense
   boundary, so Next *streamed* the response and flushed the status line
   before the page function — and therefore before `notFound()` — had run.
   The 404 survived only as `<template
   data-dgst="NEXT_HTTP_ERROR_FALLBACK;404">` in the body. Visitors saw the
   right page; crawlers saw `200 OK` for a page that does not exist. Deleting
   that one file makes Next await the component before flushing. The skeleton
   is the only loss, and it barely showed — published slugs are prerendered
   and then ISR-cached for an hour. **page.tsx now warns against re-adding
   it**, because nothing in the UI reveals the regression.

2. **Publishing a project did not refresh `sitemap.xml`.**
   `revalidateProject` busted the projects *tag*, which invalidates the data
   the sitemap reads but not the route's own ISR output — that has its own
   `revalidate = 3600`. Production was serving a sitemap listing neither
   project with a `lastmod` predating both. `app/sitemap.ts`'s comment had
   claimed the tag alone was enough. Fixed with
   `revalidatePath("/sitemap.xml")`, and the comment corrected.

**Three measurement traps worth remembering**, each of which produced a
convincing false result before being run down:

- **Lazy images read as broken.** All seven homepage images reported
  `complete: false, naturalWidth: 0`. They were `loading="lazy"` in a browser
  pane that was not compositing frames, so they never started. Every URL
  fetched 200 with a correct image content type. **Fetch the URL; don't trust
  `naturalWidth` in a headless/hidden context.**
- **`w=3840` in an `img` `src` is not an over-fetch.** Next puts the largest
  candidate in `src` as the no-`srcset` fallback; the browser picks from
  `srcset` using `sizes`, which were correct. Nearly reported as a
  performance bug.
- **Substring matching on a slug is not a leak test.** `/SignMind/i` matched
  the *slug* `signmind-x` inside OG-card URLs and the router payload on a
  page that contained no project content at all. Match the display name, and
  check `<h1>`/`<title>`, before concluding anything leaked.

---

**The sitemap fix took two attempts — the first one silently did nothing
(`v1.0.3` → `v1.0.4`).** Worth recording because the wrong fix looked
entirely reasonable and shipped green.

`v1.0.3` added `revalidatePath("/sitemap.xml")` to `revalidateProject`.
**`revalidatePath` does not reach Next's metadata routes**, so the call was a
no-op. Nothing about the build, the types or the tests could have caught it;
it was only found by toggling a real project off and on through the admin UI
and watching production. The row's `updated_at` was 46 seconds old — the
action had certainly run — while `/sitemap.xml` still answered
`x-vercel-cache: HIT` with the project absent.

The real problem was that `app/sitemap.ts` had `export const revalidate =
3600` at all. **A route cache and a data cache are different things**:
`updateTag(CACHE_TAGS.projects)` invalidated the query the sitemap reads,
while the already-rendered XML kept being served for up to an hour
regardless. The route is now `force-dynamic`, so the existing `updateTag` is
sufficient — it re-renders per request against the data cache the tag just
invalidated. Cost is near zero: every read goes through `lib/data`'s
`unstable_cache` wrappers, so a request is a cache lookup rather than a
database round trip until a publish busts the tag. The build output confirms
it, `/sitemap.xml` moving from `○ (Static)` to `ƒ (Dynamic)`.

Verified live: the sitemap now lists both projects with `x-vercel-cache:
MISS`, `age: 0`. Both files carry a note that `revalidatePath` was tried here
and does not work, so it doesn't get re-added.

**Final production state, all re-verified after `v1.0.4`:** homepage 200 with
the real title and an `og:image`; both project pages 200 with correct `<h1>`s;
the projects index listing both; an unknown slug 404; the resume streaming
`application/pdf`; `site_settings` populated (title, meta description, OG
image); and content plus media backups taken and validated (47 rows across 15
tables, 17 objects / 17MB across 9 buckets). The backup lives in `backups/`,
which is git-ignored but inside the OneDrive-synced project folder, so it has
an offsite copy — which matters, because the Supabase free plan has no
automatic backups.
