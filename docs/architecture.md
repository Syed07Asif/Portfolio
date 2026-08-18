# Architecture

> Rendering strategy, auth flow, and a full system diagram are still stubs —
> to be filled in as later phases add the frontend and admin panel. This file
> currently covers the security model (Phase 3) and the data access layer,
> including caching (Phase 4).

## Security

Everything below is implemented in
[`supabase/migrations/20260816103908_rls_and_storage.sql`](../supabase/migrations/20260816103908_rls_and_storage.sql).
Proven correct — not just written — by
[`tests/database/rls-check.sql`](../tests/database/rls-check.sql); see
[Proving it works](#proving-it-works).

### The RLS model

Row Level Security is enabled on every table from Phase 2, with no
exceptions. The pattern is the same everywhere:

- A `select`-only policy lets `anon` and `authenticated` read public rows —
  `published = true` (or `status = 'published'` for `blog_posts`, `is_active
  = true` for `resumes`).
- A `for all` policy lets the admin do all four operations, gated by
  `is_admin()` (see below).
- `anon` has no insert/update/delete policy on anything, anywhere. With RLS
  enabled, no matching policy means the operation is denied regardless of
  the base `GRANT`s below — RLS is what actually decides "which rows,"
  `GRANT` only decides "this role may attempt this kind of statement at
  all."

**The base `GRANT`s matter too, and aren't automatic.** New tables in this
project are *not* granted to `anon`/`authenticated` by the platform — verified
against a real local Supabase stack, where a freshly created table came back
with `TRUNCATE`/`REFERENCES`/`TRIGGER`/`MAINTAIN` for those roles but no
`SELECT`/`INSERT`/`UPDATE`/`DELETE`. Without an explicit `GRANT`, even a
row a policy would otherwise allow is unreachable ("permission denied for
table x", not an RLS-shaped empty result). The migration grants `SELECT` to
`anon`/`authenticated` and `INSERT`/`UPDATE`/`DELETE` to `authenticated` on
every Phase 2 table, plus an `ALTER DEFAULT PRIVILEGES` so a table added in
a later migration doesn't quietly repeat this.

Two exceptions to the plain "published rows only" rule:

- **Child tables** (`project_technologies`, `project_features`,
  `project_media`) have no `published` column of their own — a project's
  media shouldn't need a separate publish toggle. Their read policy uses an
  `EXISTS` subquery against `projects.published` instead, so a technology row
  is only visible when its parent project is:

  ```sql
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_technologies.project_id and p.published = true
    )
  )
  ```

  This lives in the policy, not in application code — any query against
  these tables, from any caller, gets this rule for free.

- **`site_settings`** has no public `select` policy on the base table at
  all — direct queries return zero rows for anyone but the admin. RLS is
  row-level, so it can't redact individual columns (`id`, `is_singleton`,
  `created_at`, `updated_at` are internal bookkeeping that shouldn't be
  public). Instead, a view — `public.public_site_settings` — selects only
  the safe columns (`site_title`, `meta_description`, `og_image_url`,
  `primary_nav`, `feature_flags`, `analytics_enabled`) and is granted to
  `anon`/`authenticated` directly. The view works without an `anon` policy
  on the base table because Postgres exempts a table's *owner* from its own
  RLS by default, and the view runs with its owner's privileges — the
  migration role owns both. The public-facing frontend should always query
  `public_site_settings`, never `site_settings` directly.

`profile` and `skill_categories` have no `published` column either, but for
the opposite reason: they're not draft-able. `profile` is a single always-on
row, and a category is just a grouping — only the skills inside it carry a
draft state. Both get an unconditional `using (true)` read policy.

### What "admin" means

There is exactly one admin: Syed Asif. That's implemented as an **allowlist
table**, not a custom JWT claim:

```sql
create table private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

`private` is a schema PostgREST never exposes — only schemas listed in the
project's API settings are reachable over the API, and `private` isn't one
of them — so this table can't be queried through the API regardless of RLS.
RLS is enabled on it anyway, with **zero policies**, so even a direct
Postgres connection as `authenticated` sees nothing. It's only ever touched
from the SQL editor or a migration; see
[docs/deployment.md](./deployment.md#admin-account) for how a row gets added.

```sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, private, auth
as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;
```

**Why an allowlist table instead of a custom claim:** a custom JWT claim
(e.g. `app_metadata.role = 'admin'`) would work too, but it means the
"who's admin" answer lives partly in Supabase Auth's user metadata and
partly wherever that metadata gets set (dashboard, Admin API call, a
one-off script) — there's no single place to look, and no history. An
allowlist table is one row in one place, auditable with a normal `SELECT`
from the SQL editor (as the table owner), and trivial to reason about with
exactly one admin: either the row exists or it doesn't. It also composes
better with future changes — moving to multiple admins later is adding
rows, not redesigning the auth flow. The tradeoff is an extra table lookup
per policy check, which is irrelevant at this scale.

`is_admin()` is `security definer` so it can read `private.admins` despite
the caller having no grant on that schema — it runs with the function
owner's privileges, not the caller's, while `auth.uid()` inside it still
reflects whoever is actually calling. That's what makes it safe to expose:
it only ever answers "is *this* caller an admin," never anyone else's.

### The three Supabase clients

All three live in [`lib/supabase/`](../lib/README.md) — see that folder's
README for the one-line version. When to use which:

| Client | Key | Use it for | Subject to RLS? |
| --- | --- | --- | --- |
| `client.ts` | anon | Client Components | Yes |
| `server.ts` — `createClient()` | anon + cookie session | Server Components, Server Actions, Route Handlers acting as the current user | Yes |
| `server.ts` — `createStaticClient()` | anon, no cookies | `lib/data`'s public read functions (see [Caching strategy](#caching-strategy) — cookies can't be used inside `unstable_cache`) | Yes |
| `admin.ts` | service-role | Trusted server-side operations that must bypass RLS | **No** |

`createClient()` should cover almost everything else server-side — the
current user's session (anonymous visitor or the signed-in admin) flows
through cookies, and RLS enforces the same rules it would over the API.
`admin.ts` exists for the small set of operations where that's not enough
(e.g. an admin action gated by application logic rather than a row the
current user's session can already see). Default to `createClient()`; reach
for `admin.ts` deliberately, not by habit.

**Why the service-role key never reaches the browser:** it bypasses RLS
entirely — anyone holding it can read or write any row in any table,
published or not, admin-only or not. `admin.ts` starts with `import
"server-only"`, a Next.js marker package that turns any accidental import of
that file from a Client Component into a **build failure**, not a runtime
leak. It's also never exposed through a `NEXT_PUBLIC_*` env var (see
[.env.example](../.env.example)) and per [CLAUDE.md](../CLAUDE.md) is never
read outside server-side code.

### Storage policy model

Eight buckets (`profile`, `projects`, `certifications`, `achievements`,
`experience`, `education`, `resume`, `blog`), one per content area, all
`public = true` with a `file_size_limit` and `allowed_mime_types` allowlist
matching what that area actually stores (e.g. `resume` only accepts
`application/pdf`; the others accept images, and `projects` additionally
accepts video and PDF for project media/documents).

Policies on `storage.objects` follow the exact same public-read/admin-write
shape as the content tables, written once across all eight buckets instead
of repeated per bucket:

- `select` — `anon`, `authenticated` — any object in one of the eight
  buckets
- `insert` / `update` / `delete` — `authenticated` **and** `is_admin()`

`public = true` on the bucket makes the plain public object URL work without
going through RLS at all (that's how Supabase serves public buckets); the
`storage.objects` policies above additionally cover access through the
Supabase client/API (`.list()`, `.download()`, etc.), so the same rule holds
no matter how an object is reached.

### Proving it works

[`tests/database/rls-check.sql`](../tests/database/rls-check.sql) is a
self-contained script that seeds one published + one unpublished row per
table, then asserts — as `anon` — that only the published ones are visible,
that a child row's visibility follows its parent project, that `anon` can't
`INSERT`/`UPDATE`/`DELETE` anywhere, that the `is_admin()` bypass actually
works for the admin and *doesn't* for an ordinary authenticated user, and
that the storage read/write split holds too. Everything runs inside a
transaction that always rolls back, so it's safe to run against any
environment, including production:

```bash
psql "<connection-string>" -v ON_ERROR_STOP=1 -f tests/database/rls-check.sql
```

It was first run against a disposable Postgres container (with `auth`/`storage`
schemas and `anon`/`authenticated` roles reconstructed by hand to match a
real Supabase project) while writing this migration, and every assertion
passed — but that hand-built harness turned out to be more permissive than
reality: it granted `anon`/`authenticated` broad table privileges
up front, matching an assumption about Supabase's default behavior that
turned out to be wrong (see [Base privilege
grants](#the-rls-model)). Re-run in Phase 4 against a genuine local Supabase
stack (`supabase start`), it surfaced two real bugs the hand-built harness
had been masking:

1. `alter table storage.objects enable row level security` fails on real
   Supabase with "must be owner of table objects" — that table is owned by
   `supabase_storage_admin`, not the migration role. Fixed by wrapping it in
   a `do` block that catches `insufficient_privilege` and no-ops (it only
   needs to actually run on a bare local Postgres instance that doesn't
   already have RLS on).
2. New tables are *not* automatically granted to `anon`/`authenticated` —
   fixed by adding the explicit `GRANT`s described above.

Both were fixed directly in this migration file rather than as follow-up
migrations, since neither bug had been applied to any real environment yet
(no live Supabase project existed at the time) — see
[CLAUDE.md](../CLAUDE.md) on migrations being the source of truth; there was
no drift to reconcile, just incorrect SQL to correct before it ever ran
anywhere that mattered. After both fixes, `supabase db reset` + the same
proof script passed cleanly against the real stack.

## Data access layer

Three layers, each with one job:

1. **`types/database.ts`** — generated by the Supabase CLI from the schema.
   Exact, exhaustive, never hand-edited, never imported outside `types/`.
2. **`types/content.ts`** — hand-authored domain types (`Project`,
   `ProjectDetail`, `SkillWithCategory`, ...) derived from `database.ts` via
   `Pick`, matching exactly what each `lib/data` function selects. Every
   component and `lib/data` module imports from here.
3. **`lib/validation/`** — one Zod schema per entity, matching `content.ts`'s
   shapes. The single source of truth for both admin form validation and
   server-side validation once the admin panel exists — a schema is
   defined once and used on both sides of that boundary.

`lib/data/` sits on top of all three: one module per entity, each exporting
plain async functions that use `createStaticClient()`, select only the
columns `content.ts` promises, filter to published content, order by
`display_order` then a sensible tiebreaker (e.g. most recent `start_date`
first), and return a typed result. A failed query is caught, logged
server-side via `console.error`, and turned into `null`/`[]` rather than
thrown — a public page should render with a section missing, never crash,
if Supabase is briefly unreachable.

`getProjectBySlug()` fetches the project plus its technologies, features,
and media in a single PostgREST request using embedded resources
(`project_technologies(...)`, `project_features(...)`, `project_media(...)`
inside one `.select()`) — one SQL query with joins server-side, not four
round trips.

Each module exports two functions: `fetchX` (the raw query) and `getX`
(`fetchX` wrapped in `unstable_cache` — see [Caching
strategy](#caching-strategy)). Components and pages only ever call `getX`;
`fetchX` is exported solely so [`tests/lib/data/smoke.ts`](#proving-the-data-layer-works)
can exercise the real query logic outside a full Next.js server runtime,
which `unstable_cache` requires and a standalone script isn't.

### Caching strategy

Every `lib/data` function is wrapped in `unstable_cache` (`next/cache`) with
two things attached:

- **`revalidate: 3600`** — a one-hour time-based fallback. This is a
  portfolio site; content changes rarely, so staleness up to an hour is a
  non-issue on its own.
- **A tag from `CACHE_TAGS`** (`lib/constants.ts`) — one tag per entity
  (`"projects"`, `"skills"`, ...), so a change to one entity never
  invalidates unrelated cached data.

`unstable_cache` (not route-level `fetch` caching) is the right tool here
because the data source is the Supabase client, not a raw `fetch` call the
Next.js cache can intercept on its own — `unstable_cache` caches whatever
the wrapped function returns, regardless of how it got there. It does
forbid dynamic APIs like `cookies()` inside the wrapped function, which is
exactly why `lib/data` uses `createStaticClient()` (no cookies) rather than
`server.ts`'s cookie-aware `createClient()` — public reads don't need
session awareness anyway, since they only ever return published content no
matter who's asking.

**How the admin panel invalidates this (future phase):** every write the
admin panel makes is a publish/unpublish/edit of some entity. After that
write succeeds, the server action calls `revalidateTag(CACHE_TAGS.<entity>)`
for the entity that changed, which immediately invalidates every cache
entry tagged with it — the next request to any `lib/data` function for that
entity re-queries Supabase instead of serving the stale hour-old result. The
one-hour `revalidate` is purely a safety net for content that changed
through some path that forgot to call `revalidateTag` (there shouldn't be
one, but the fallback costs nothing); tag-based invalidation is what makes a
publish feel instant.

### Per-route revalidation: `/projects/[slug]`

The caching strategy above covers `lib/data` — a cache of *query results*.
A statically-generated dynamic route has a second, separate cache layer on
top of that: Next's Full Route Cache, which stores the *rendered page*
itself. `app/projects/[slug]/page.tsx` is the first route in this project
where that second layer actually matters, so it's worth spelling out how
the two interact to satisfy "a newly published project goes live at its
own URL with no redeploy":

1. **`generateStaticParams()` (calling `getProjectSlugs()`) pre-renders
   every currently-published project at build time.** Fast, fully static
   HTML for anything that existed at the last build.
2. **`dynamicParams` is left at its Next.js default (`true`) — not
   exported/overridden anywhere in the route.** This is the load-bearing
   part: a slug that *doesn't* appear in `generateStaticParams()`'s list
   (a project published after the last build) isn't a 404. Next falls
   through to rendering the page on demand for that request, calling the
   exact same `getProjectBySlug()` — which either returns the new project
   (page renders normally and gets cached from then on) or `null`
   (`notFound()` fires, exactly as it would for a typo'd slug). A brand
   new project is live the moment it's published and requested once — no
   build, no redeploy.
3. **`export const revalidate = 3600` on the page puts the *pre-rendered*
   pages into ISR** — without it, statically generated pages are cached
   indefinitely (until the next build), so an *edit* to an
   already-published project (new description, swapped screenshot, ...)
   would never appear on its already-generated page no matter how long you
   waited. `3600` matches `lib/data`'s own `revalidate` so both layers go
   stale on the same schedule rather than one masking the other.
4. **Once the admin panel exists**, its publish/edit action calling
   `revalidateTag(CACHE_TAGS.projects)` (see above) invalidates the data
   layer immediately; pairing that with Next's `revalidatePath("/projects/
   [slug]")` (or tag-based route revalidation, if the admin action already
   knows the specific slug) would make step 3's up-to-an-hour wait instant
   too, the same way it already does for the data cache. That pairing
   isn't wired up yet — there's no admin write path to call it from — but
   the route is already structured so adding it later is a one-line change
   in that future server action, not a change to this page.

### Proving the data layer works

[`tests/lib/data/smoke.ts`](../tests/lib/data/smoke.ts) calls every
`fetchX` function and prints what came back — shape, and a preview of the
actual value — so a broken query, a wrong column name, or an empty result is
obvious before any page exists to notice it. Run it with:

```bash
npx supabase start
npx supabase status -o env   # copy API_URL → NEXT_PUBLIC_SUPABASE_URL, anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run smoke:data
```

Run against a real local Supabase stack (`supabase start`, not a bare
Postgres container — this needs actual PostgREST, since the data layer
talks to Supabase over its REST API, not a Postgres wire connection) with
migrations and `supabase/seed.sql` applied, every function returned real
seeded data with the expected shape and nothing threw. Getting there
surfaced the same two migration bugs documented in [Proving it
works](#proving-it-works) — `fetchProfile()` and the rest came back
`permission denied for table x` until the missing `GRANT`s were added — plus
one testability gap: `unstable_cache` (used by every `getX`) throws
`Invariant: incrementalCache missing` outside a full Next.js server runtime,
which is exactly why this script calls the unwrapped `fetchX` functions
instead of `getX`.

## Design system

The full token set lives in [`styles/tokens.css`](../styles/tokens.css) and
is exposed as Tailwind utilities via the `@theme inline` block in
[`styles/globals.css`](../styles/globals.css). Every one of them is
rendered live at [`/styleguide`](../app/styleguide/page.tsx) — that page is
the actual source of truth for "does this token work," not this document.

**The rule, per [CLAUDE.md](../CLAUDE.md):** components compose existing
tokens (`bg-surface`, `text-h2`, `rounded-lg`, `shadow-glow-accent-md`,
`ease-out-expo`, ...) and never write an arbitrary value. If a component
needs a colour, size, or timing that doesn't exist yet, the fix is a new
token in `tokens.css`, not a one-off literal in the component.

### Why CSS tokens, not `tailwind.config.ts`

The brief asked to "extend `tailwind.config.ts`," but this project is on
Tailwind v4, which is CSS-first: the `@theme` block *is* the config. A
`tailwind.config.ts` still works in v4 (loaded via an `@config` directive)
but exists for things CSS can't express — custom plugins, a `content`
safelist, JS-computed values — none of which this project needs; v4 also
auto-detects template files without a `content` array. Adding an empty
config file just to have one would be dead weight a reader has to figure
out does nothing, which is worse than not having it. `styles/tokens.css` +
`styles/globals.css`'s `@theme inline` block together are the Tailwind
config, and every token was verified end-to-end (computed `font-size`,
`line-height`, `letter-spacing`, `border-radius`, `box-shadow`, and
`background-color` all matched their source token exactly) against the
running dev server while building this phase.

### Token categories

| Category | Tokens | Tailwind utilities |
| --- | --- | --- |
| Surfaces | `--color-background/surface/surface-raised/overlay/border/border-strong` | `bg-background`, `bg-surface`, `border-border`, ... |
| Foreground | `--color-foreground/-secondary/-muted` | `text-foreground`, `text-foreground-secondary`, `text-foreground-muted` |
| Accent | `--color-accent/-hover/-muted/-foreground` | `bg-accent`, `text-accent`, `bg-accent-hover`, ... |
| Decorative glow | `--color-glow-cyan/-warm` | `bg-glow-cyan`, `shadow-glow-cyan`, ... |
| Semantic | `--color-success/warning/danger/info` | `bg-success`, `text-danger`, ... |
| Typography | `--text-display/h1-h4/body-lg/body/small/caption` (size + line-height + letter-spacing, paired) | `text-display`, `text-h2`, `text-caption`, ... |
| Font families | `--font-display` (Sora), `--font-body` (Inter) | `font-display`, `font-body` |
| Radius | `--radius-sm/md/lg/xl/2xl/full` | `rounded-sm` … `rounded-full` |
| Shadow / glow | `--shadow-sm/md/lg`, `--glow-accent-sm/md/lg`, `--glow-cyan/-warm` | `shadow-sm`, `shadow-glow-accent-md`, ... |
| Easing | `--ease-out-expo/-out-quart/-in-out-quart/-spring` | `ease-out-expo`, ... (CSS transitions) |
| Durations | `--duration-instant/fast/base/slow/slower` | not mapped to a Tailwind namespace — see below |
| Spacing rhythm | `--space-section-y/-y-lg/-container-x` | referenced directly (`style`/arbitrary-property), no dedicated utility |
| Border width | `--border-width-thin/medium/thick` | `border` (1px) / `border-[length:var(--border-width-medium)]` / `border-2` (2px) |

**Why durations aren't a Tailwind namespace:** Tailwind's `duration-*`
utilities are a fixed numeric scale (`duration-150`, `duration-300`, ...),
not a `--duration-*` theme namespace the way `--radius-*`/`--shadow-*` are —
there's nothing to remap. It doesn't matter in practice: almost all
animation in this project runs through Framer Motion (`lib/motion.ts`), not
CSS `transition-duration` utilities, and Framer Motion needs numeric
seconds in JS anyway (see below).

### Fonts

Loaded via `next/font/google` in `app/layout.tsx`: **Sora** (`--font-sora`,
mapped to the `--font-display` token) for headings — geometric, heavy at
high weights, matching the reference's bold uppercase display type — and
**Inter** (`--font-inter`, mapped to `--font-body`) for body copy. Both use
the `latin` subset and `display: "swap"` so text renders in a fallback font
immediately rather than staying invisible while the webfont loads.

### Motion

[`lib/motion.ts`](../lib/motion.ts) exports every reusable variant:
`fadeInUp`, `fadeIn`, `scaleIn`, `staggerContainer`/`staggerItem`,
`revealOnScroll`, `hoverLift`/`hoverGlow`, `pageTransition`. Sections import
these rather than writing their own `transition`/`variants` objects, so the
whole site shares one motion vocabulary.

Durations and easing curves are re-declared in that file as plain JS
constants (seconds, and bezier arrays) rather than read from
`tokens.css`'s custom properties — Framer Motion variants are evaluated as
plain objects at module load, including during SSR, before any stylesheet
or DOM exists to read `getComputedStyle` from. The two are kept in sync by
hand; `lib/motion.ts`'s header comment says so at the point someone would
edit either one.

**Reduced motion is automatic**, per the brief's requirement that sections
never handle it themselves:
[`components/motion/MotionProvider.tsx`](../components/motion/MotionProvider.tsx)
wraps the app in Framer Motion's own `<MotionConfig reducedMotion="user">`
(mounted once, in `app/layout.tsx`). When the OS-level `prefers-reduced-motion`
preference is set, every `motion.*` animation anywhere in the app —
including every variant above — automatically drops transform-based motion
(position, scale, rotation) to an instant application and keeps only
opacity/colour transitions, with zero per-section opt-in.

### `/styleguide`

Renders every token category and a live, replayable demo of every motion
variant — the brief's own visual QA tool, and also how the token mappings
above were actually verified rather than assumed. Visible in local dev and
Vercel preview deployments; 404s (via `notFound()`) when
`VERCEL_ENV === "production"`, and carries `robots: { index: false, follow:
false }` regardless, so it never appears in search results even before that
gate matters.
