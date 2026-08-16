# Architecture

> Rendering strategy, auth flow, and a full system diagram are still stubs —
> to be filled in as later phases add the frontend and admin panel. This file
> currently covers the security model, since that's what Phase 3 built.

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
  enabled, no matching policy means the operation is denied — this holds
  regardless of the coarse `GRANT`s Supabase applies to every project by
  default (`anon`/`authenticated` get broad table-level DML grants; RLS,
  not those grants, is the actual boundary).

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
| `server.ts` | anon + cookie session | Server Components, Server Actions, Route Handlers acting as the current user | Yes |
| `admin.ts` | service-role | Trusted server-side operations that must bypass RLS | **No** |

`server.ts` should cover almost everything server-side — the current user's
session (anonymous visitor or the signed-in admin) flows through cookies,
and RLS enforces the same rules it would over the API. `admin.ts` exists for
the small set of operations where that's not enough (e.g. an admin action
gated by application logic rather than a row the current user's session can
already see). Default to `server.ts`; reach for `admin.ts` deliberately, not
by habit.

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

It was run against a disposable Postgres container (with `auth`/`storage`
schemas and `anon`/`authenticated` roles reconstructed to match a real
Supabase project) while writing this migration, and every assertion passed.
