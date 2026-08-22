# Development

How to work on this codebase: the conventions it holds itself to, how to add
a new content type end to end, how to add a new public section, and what was
deliberately left undone.

**Contents**

- [Getting a working environment](#getting-a-working-environment)
- [Conventions](#conventions)
- [Testing](#testing)
- [Branching and releases](#branching-and-releases)
- [Adding a new content type, end to end](#adding-a-new-content-type-end-to-end)
- [Adding a new public section](#adding-a-new-public-section)
- [Adding a design token](#adding-a-design-token)
- [Gotchas worth knowing before they cost you an hour](#gotchas-worth-knowing-before-they-cost-you-an-hour)
- [FUTURE WORK](#future-work)

---

## Getting a working environment

Full quickstart is in [README.md](../README.md). The two-line version:

```bash
npm install
npx supabase start --exclude studio,logflare,vector,imgproxy,edge-runtime,mailpit,supavisor,realtime,postgres-meta
npx supabase db reset
npm run dev
```

The `--exclude` set is not arbitrary — the full Supabase stack is heavy and
flaky on a laptop, and this set is the minimum that actually works: Postgres,
PostgREST, Auth (needed for `/admin`), Kong, and `storage-api` (needed for
real file uploads). See [`supabase/README.md`](../supabase/README.md).

Then copy `.env.example` to `.env.local` and fill it from
`npx supabase status -o env`. **Do not hand-type a "well-known local demo"
anon key from memory** — the fixed pair some tutorials quote does not match
this CLI version's local `jwt_secret` and fails with `PGRST301 "None of the
keys was able to decode the JWT"`, which is very easy to misdiagnose as an
RLS problem.

`db reset` wipes `auth.users` and `private.admins`, so it destroys your local
admin account. Recreating it is two steps and is documented in
[docs/progress.md](./progress.md) — budget for it whenever you add a
migration.

---

## Conventions

The full ruleset is [CLAUDE.md](../CLAUDE.md). This section covers the parts
that come up while actually writing code.

### The core principle, restated as a test

> The code defines how the portfolio works. The database defines what it
> contains.

If adding a project, job, skill or certification would require editing a
`.tsx` file, something is wrong: either the schema is missing a field, or a
component is hard-coding something that belongs in Supabase. That is the
question to ask in review, and it is the one this whole architecture exists
to keep answerable with "no."

### Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Components | PascalCase | `ProjectCard.tsx` |
| Functions, variables | camelCase | `getProjects`, `formatDateRange` |
| Route files and folders | kebab-case | `app/projects/[slug]/page.tsx` |
| Hooks | camelCase, `use`-prefixed | `useMediaQuery` |
| Migrations | `<timestamp>_snake_case.sql` | `20260822120000_service_role_grants.sql` |

### Where things go

```
components/ui/        hand-built primitives for the PUBLIC site
components/admin/ui/  shadcn/ui primitives — admin/overlay ONLY
```

These two never mix. `components/ui/` is never allowed to import from
`components/admin/ui/`, and the public site never renders a shadcn component.
The separation exists so shadcn's default styling can never contaminate the
public site's hand-built visual language, and it is worth defending.

### No arbitrary Tailwind values

`bg-[#1a1f38]`, `p-[18px]`, `rounded-[14px]` are all bugs. Colours, spacing,
radii, shadows, durations and easings are design tokens in
[`styles/tokens.css`](../styles/tokens.css), exposed as utilities. If a token
doesn't exist for what you need, **add the token**; don't reach for a
literal. The one exception is `[property:var(--token-name)]` arbitrary-
*property* syntax when no utility class maps to an existing token — that's
still fully token-driven, just spelled differently.

### Secrets never reach the client

`SUPABASE_SERVICE_ROLE_KEY` is read in exactly one file,
[`lib/supabase/admin.ts`](../lib/supabase/admin.ts), which imports
`server-only` so a `"use client"` import is a build error. Keep it that way.
See [docs/deployment.md](./deployment.md#supabase_service_role_key-must-not-be-next_public_).

### Comments

Comment the *why*, not the *what*. This codebase leans heavily on comments
that record a decision and the evidence behind it — especially where the
obvious approach was tried and didn't work. Those comments are why a reader
two years from now doesn't re-make the same mistake, and they're worth
writing at the moment you learn the thing.

---

## Testing

```bash
npm test           # Vitest — 52 tests, ~2s. Needs the local Supabase stack.
npm run test:e2e   # Playwright — 33 tests x Chrome and Edge, ~6min.
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript
npm run smoke:data # End-to-end sanity check of lib/data against a live stack
```

Both suites need **the local Supabase stack running**, and the E2E suite
needs **a production server** (`npm run build && npm run start`) — Playwright
will start one itself but reuses an existing one. Dev-server numbers are
meaningless for anything performance-related, which is the whole lesson of
Phase 24.

Two rules that come from real pain:

- **Don't run `npm run build` while Playwright or Lighthouse is running.**
  They collide, and Playwright's `webServer` teardown will kill a server
  Lighthouse is mid-run against — reporting `CHROME_INTERSTITIAL_ERROR`,
  which looks like an app fault and is not one.
- **A wiped local admin account fails every Playwright test at once.** The
  E2E suite signs in with the credentials in `tests/e2e/helpers.ts`. If every
  test suddenly fails, check that account before you check your code.

The E2E suite creates rows prefixed `zz-` and deletes them in `afterAll`. If
a run is interrupted, `select slug from projects where slug like 'zz-%'`
shows the leftovers.

---

## Branching and releases

- `develop` — all work happens here.
- `main` — the released state. Vercel's production branch.
- Tags mark releases. `v1.0.0` is the launch.

A production deploy is a merge to `main`. See
[docs/deployment.md](./deployment.md#rolling-back) for what to do when one
goes wrong.

---

## Adding a new content type, end to end

This is the walkthrough worth reading before touching anything, because the
layers only make sense together. Say you're adding **talks** (conference
talks Syed has given).

Every step has an existing example to copy. `certifications` is the best
model: it's a flat, standalone, publishable entity with an image, which is
what most new content types are.

### 1. Migration — the schema

`supabase/migrations/<timestamp>_create_talks.sql`:

```sql
create table public.talks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_name text not null,
  talk_date date,
  slides_url text,
  published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger talks_set_updated_at
  before update on public.talks
  for each row execute function public.set_updated_at();

create index talks_published_sort_idx on public.talks (published, display_order);
```

Then — and this is the part that is easy to forget, because RLS and GRANT are
two separate layers:

```sql
alter table public.talks enable row level security;

create policy talks_public_read on public.talks
  for select to anon, authenticated using (published);

create policy talks_admin_all on public.talks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.talks to anon, authenticated;
grant insert, update, delete on public.talks to authenticated;
grant select, insert, update, delete on public.talks to service_role;
```

Copy the exact policy shape from
`20260816103908_rls_and_storage.sql` rather than improvising — see
[docs/database.md](./database.md#rls-policies).

If the new type needs its own uploads, add a Storage bucket and extend the
`portfolio_buckets_*` policies' bucket lists (the pattern
`20260818091500_settings_storage_bucket.sql` established: drop and recreate
each policy with the new bucket included).

Apply it: `npx supabase db reset` (and recreate your admin account).

### 2. Regenerate the database types

```bash
npx supabase gen types typescript --local > types/database.ts
```

Never hand-edit `types/database.ts`, and never import it outside `types/`.

### 3. Domain type

In [`types/content.ts`](../types/content.ts), derive the hand-authored type
from the generated one. This is what the rest of the app imports.

### 4. Zod schema

`lib/validation/talk.ts` — one schema per entity, and the single source of
truth for both the admin form and the server action's validation. Mirror the
column constraints; if the column is `not null`, the schema should be too.

Watch for the relative-asset-path rule: URL fields that may hold either a
full Storage URL *or* a same-origin relative path need the union validator
the other schemas use. Getting this wrong has been a real bug in this project
**twice**, in Phases 19 and 21.

### 5. Data access

`lib/data/talks.ts`, following the shape every other module in
[`lib/data/`](../lib/data) uses:

- `fetchTalks()` — the raw query. Unwrapped, so it works outside a Next
  server runtime (which is why the smoke test can call it).
- `getTalks()` — `fetchTalks` wrapped in `unstable_cache` with a cache tag.

Add the tag to `CACHE_TAGS` in [`lib/constants.ts`](../lib/constants.ts), and
export from `lib/data/index.ts`.

`unstable_cache` **throws outside a real Next server runtime** — that's why
the unwrapped `fetchX` exists as a separate export, not as an implementation
detail.

### 6. Public section

`components/sections/Talks.tsx`, receiving content as props and composing
`components/ui/` primitives. It must render sensibly when handed an empty
array — see [docs/empty-states.md](./empty-states.md).

Then render it from the page, and add its anchor id to `SECTION_IDS`.

### 7. Admin module

`app/admin/talks/` — list, `new`, and `[id]/edit`, plus the server actions.
Phase 18's shared admin infrastructure does most of the work: `AdminTable`
(including drag-to-reorder), the form primitives, the publish/unpublish
toggle, and the delete confirmation are all already built and generic. Copy
`app/admin/certifications/` and change the entity.

Add the sidebar link. Wire the server action to `revalidateTag` with the tag
from step 5 — a write that doesn't invalidate its tag produces the "I
published it and nothing happened" bug.

### 8. Seed, docs, tests

- Add one realistic row to [`supabase/seed.sql`](../supabase/seed.sql).
- Add the table to `TABLES` in
  [`scripts/export-content.ts`](../scripts/export-content.ts), in FK-safe
  position. **A content type missing from that list is silently absent from
  every backup.**
- Document the table in [docs/database.md](./database.md) and the admin
  screen in [docs/content-management.md](./content-management.md).
- Extend the E2E draft-privacy test to cover the new table.

### The checklist, compressed

```
migration (table + RLS + grants)  →  gen types  →  types/content.ts
  →  lib/validation/  →  lib/data/ + CACHE_TAGS  →  components/sections/
  →  app/admin/  →  seed.sql  →  scripts/export-content.ts TABLES
  →  docs  →  tests
```

Eleven steps, and **zero** of them are "add the content" — that's a row.

---

## Adding a new public section

Smaller job, when the content type already exists.

1. **Build it in `components/sections/`.** Props in, no data fetching inside
   the component. Compose `components/ui/` primitives; don't reinvent a Card.
2. **Give it a `Section` wrapper with an id.** The shared `Section` primitive
   carries `scroll-mt-(--header-height)`, so anchor scrolling is offset
   correctly for the fixed header with no JS scroll maths.
3. **Add the id to `SECTION_IDS`** in `lib/constants.ts`.
4. **Fetch in the page, pass as props.** The page is a Server Component; it
   calls `getX()` and hands the result down.
5. **Wrap it in `<Suspense>`** with a skeleton, so a slow section streams
   rather than blocking the page.
6. **Handle empty.** Decide whether an empty section renders an `EmptyState`
   or nothing at all, and be deliberate about it —
   [docs/empty-states.md](./empty-states.md) records the decision made for
   every existing section.
7. **Nav is data, not code.** Nav items come from
   `site_settings.primary_nav`. Adding the section to the nav is a database
   edit in `/admin/settings`, not a code change.
8. **Check it at 360px** and under `prefers-reduced-motion`. The E2E suite
   asserts both; a new section that overflows horizontally on mobile will
   fail `responsive.spec.ts`.

---

## Adding a design token

1. Add the custom property to [`styles/tokens.css`](../styles/tokens.css).
2. Expose it as a Tailwind utility via the `@theme inline` block in
   [`styles/globals.css`](../styles/globals.css) — **that block *is* the
   Tailwind config.** There is no `tailwind.config.ts` and adding one would
   be dead weight; Tailwind v4 is CSS-first.
3. If it's a new font-size/colour-like utility group, check whether
   `cn()`'s tailwind-merge configuration in [`lib/utils.ts`](../lib/utils.ts)
   needs to know about it. tailwind-merge silently dropped
   `text-accent-foreground` once because it couldn't tell the custom
   `text-h2` size scale from a text-colour class.
4. Add it to `/styleguide`, which is the visual QA surface for every token
   and primitive. It's `noindex` and 404s when `VERCEL_ENV=production`.

---

## Gotchas worth knowing before they cost you an hour

- **`next dev`'s lock is keyed to the project directory, not the port.** A
  second `next dev` binds its port, logs "Another `next dev` server is
  already running," and **exits 1** — so the failure looks like a successful
  start followed by an immediate exit. `autoPort` does not help. Point your
  browser at the already-running origin instead.
- **Don't `rm -rf .next` while another server is running against the
  directory.** It owns that folder. `npx next typegen` or a full `next build`
  regenerates route types without deleting anything.
- **A bare `npx tsc --noEmit` with no `.next` present** fails with spurious
  `Cannot find name 'LayoutProps'` errors — that global is generated into
  `.next/types`. Run a build first before trusting a standalone `tsc`.
- **`next dev` rewrites a `nextjs-agent-rules` block into `CLAUDE.md` on
  every run.** It's tool-generated and self-restoring; committing it with
  your work is what keeps `git status` clean.
- **Next 16 refuses to optimize remote images from local/private IPs**
  unless `images.dangerouslyAllowLocalIP` is set. Against the local Supabase
  stack (`http://127.0.0.1:54321`), `/_next/image` answers
  `400 "url" parameter is not allowed`. `next.config.ts` enables the flag
  *only* when the configured Supabase host is itself loopback/private, so
  local matches production and production keeps the SSRF guard.
- **`error.tsx` does not cover statically generated pages.** An outage on an
  ISR route returned raw "Internal Server Error" text in production until
  Phase 23 fixed it properly. `connection()` reproduces the same 500 rather
  than fixing it.
- **Empty and unreachable are different facts.** A database outage that
  looks like "no content" gets *cached* as no content. See
  [docs/architecture.md](./architecture.md#resilience).

---

## FUTURE WORK

Things deliberately not built for v1.0.0. Each was a considered decision, not
an oversight — this section exists so the next person can tell the
difference, and so "why doesn't it have X" has an answer that isn't a shrug.

### Enabling the blog

**Status:** schema and admin module exist; the public side does not.

`blog_posts` is a real table with `status ('draft' | 'published')`,
`published_at`, a unique slug, and a working (minimal) admin module from
Phase 21. What doesn't exist is any public surface: no `/blog` index, no
`/blog/[slug]` route, no nav entry, no RSS feed, and no rich-text rendering
for post bodies.

**Deferred because** a portfolio with an empty blog is worse than a portfolio
with no blog. The visible cost of shipping an empty `/blog` is immediate; the
cost of not shipping it is zero until there's something to put in it.

**To enable:** add `app/(site)/blog/page.tsx` and
`app/(site)/blog/[slug]/page.tsx` following the `projects` routes, add
`getPublishedPosts`/`getPostBySlug` to `lib/data/blogPosts.ts`, add the nav
entry as a `site_settings.primary_nav` row (a database edit, not code), add
posts to `sitemap.xml`, and decide on a body format — the schema stores text,
so Markdown with a renderer is the obvious choice, and would be the project's
first genuinely user-authored HTML, which means revisiting the CSP decision
in [docs/architecture.md](./architecture.md#security-headers-and-csp).

### Analytics

**Status:** nothing. No page-view tracking, no events, no dashboard.

There is one hook already placed for it: `app/(site)/resume/route.ts` carries
a `TODO` at the exact point every real resume download passes through, which
is the single most interesting number this site could collect.

**Deferred because** analytics is the easiest thing in the world to add later
and one of the harder things to add *well* — it drags in a consent decision
(GDPR), a third-party origin in the CSP, and a performance cost on a site
whose Lighthouse scores were hard-won in Phase 24.

**To add:** Vercel Analytics is the lowest-friction option (first-party, no
cookie banner, no CSP change beyond its own origin). A privacy-respecting
alternative like Plausible needs `script-src` and `connect-src` entries in
`next.config.ts`'s CSP. Either way, re-run Lighthouse afterwards — the mobile
LCP target is already the one metric Phase 24 didn't meet.

### Project filtering and search

**Status:** projects render as one list, ordered by `display_order`.

`project_technologies` already exists as a proper join table, which is
exactly the data a "filter by technology" UI needs.

**Deferred because** filtering a list of a handful of projects is worse than
not filtering it — the control takes more space than it saves, and the
feature's value grows with the content, which doesn't exist yet. Revisit at
roughly 12+ projects.

**To add:** a client-side filter over an already-fetched list is enough at
this size (no new queries, no URL state needed unless you want shareable
filtered views). Full-text search would want a Postgres `tsvector` column and
a GIN index — a migration, not a component.

### Contact form

**Status:** the contact section lists links (`contact_links`); there is no
form.

**Deferred because** a contact form is not a form — it's a form *plus* spam
handling, an email-sending integration, rate limiting, a server action that
accepts anonymous writes (the first such thing in an app where every write is
currently admin-only), and a privacy note about what happens to the message.
A `mailto:` link and a LinkedIn URL do the actual job with none of that.

**To add:** think about the RLS story first. Either a `messages` table with
an insert-only anon policy and strict rate limiting, or — better — no table
at all: a server action that validates with Zod and forwards to an email API,
storing nothing. Add a honeypot field and a rate limit before shipping; a
public unauthenticated write endpoint on a site with no other one is worth
being careful about.

### Also considered, not planned

- **Automated backups.** [`scripts/`](../scripts) exists and works, but
  nothing runs it on a schedule. A GitHub Actions workflow with a `schedule:`
  trigger and the two Supabase values in repository secrets would do it. Left
  manual because an unmonitored backup job that silently stops working is
  worse than a calendar reminder.
- **Orphaned Storage cleanup.** Deleting a project cascades its
  `project_media` rows but leaves the files. Nothing reaps them.
- **A second Supabase project for Preview.** See
  [docs/deployment.md](./deployment.md#one-supabase-project-or-two) for when
  this stops being optional.
- **`components/admin/ComingSoon.tsx`** is now unused — every sidebar
  destination is a real editor. Delete it whenever someone is tidying.
