# Database

The schema is defined entirely by the files in
[`supabase/migrations/`](../supabase/migrations). This document explains
what's in them. If the two ever disagree, **the migrations are correct and
this file is stale** — fix the file, don't trust it blindly.

Per [CLAUDE.md](../CLAUDE.md), every schema change is a new migration file.
Nothing is ever hand-edited in the Supabase dashboard.

**Contents**

- [The migrations](#the-migrations)
- [Conventions that apply to every table](#conventions-that-apply-to-every-table)
- [Entities](#entities)
- [Relationships](#relationships)
- [Rules](#rules)
- [RLS policies](#rls-policies)
- [Migration process](#migration-process)
- [Seed data](#seed-data)

## The migrations

Five, as of v1.0.0. They are applied in filename order and each is applied
exactly once per project; Supabase records which have run.

| File | What it adds |
| --- | --- |
| `20260816102304_create_content_schema.sql` | The 15 content tables, enums, the `updated_at` trigger, `slugify()`, indexes |
| `20260816103908_rls_and_storage.sql` | RLS on every table, `is_admin()` and `private.admins`, 8 Storage buckets + `storage.objects` policies, base grants for `anon`/`authenticated` |
| `20260818090000_resume_active_swap_function.sql` | `public.set_active_resume(uuid)` — the atomic active-resume swap |
| `20260818091500_settings_storage_bucket.sql` | A 9th bucket, `settings`, plus all four bucket policies dropped and recreated to include it |
| `20260822120000_service_role_grants.sql` | Table privileges for `service_role`, which had none — see [Migration process](#migration-process) |

Row Level Security is enabled on every table, in the second migration rather
than the first so the schema migration stays untouched. See
[RLS policies](#rls-policies) below and
[docs/architecture.md's Security section](./architecture.md#security).

## Conventions that apply to every table

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`, kept current by a `BEFORE UPDATE`
  trigger (`public.set_updated_at()`) attached to every table
- Tables that render on the public site additionally have:
  - `published boolean default false` — draft rows are never fetched by the
    public site; the admin panel (a later phase) can preview unpublished rows
  - `display_order integer default 0` — ascending order for manual sorting in
    lists (hero cards, timelines, grids)

Two helper objects, defined once and reused everywhere:

- `public.set_updated_at()` — the `updated_at` trigger function.
- `public.slugify(text)` — lowercases, replaces runs of non-alphanumeric
  characters with a hyphen, and trims leading/trailing hyphens. Not wired
  into a trigger; callers (admin UI, seed data) decide when to derive a slug.

## Entities

### `profile`
The single row describing the site owner. Enforced as one row via
`is_singleton boolean unique check (is_singleton)` — a second `INSERT` hits
the unique constraint. No `published`/`display_order` (nothing to draft or
order).

| Column | Purpose |
| --- | --- |
| `full_name` | Displayed name |
| `headline` | Short title under the name (e.g. "Analytics & ML Engineer") |
| `short_bio` | One/two sentence summary, used in hero/meta contexts |
| `long_bio` | Full about-section copy |
| `avatar_url` | Profile photo |
| `location` | Displayed location |
| `availability_status` | Free-text status (e.g. "Open to opportunities") |
| `current_role` | Current job title, shown alongside headline/tagline |
| `tagline` | Short punchy line, e.g. for the hero section |

### `skill_categories`
Groupings for `skills` (e.g. "Machine Learning", "Data Engineering"). No
`published` — a category with no published skills simply renders empty; only
individual skills are drafted/published.

| Column | Purpose |
| --- | --- |
| `name` | Category label |
| `slug` | Unique, URL-safe identifier |
| `description` | Optional supporting copy |
| `icon` | Icon identifier (e.g. a Lucide icon name) |
| `display_order` | Sort order among categories |

### `skills`
One row per skill. `category_id → skill_categories.id`, `ON DELETE RESTRICT`
— a category with skills in it can't be deleted until they're reassigned or
removed, so content isn't silently dropped.

| Column | Purpose |
| --- | --- |
| `category_id` | Owning category |
| `name` | Skill name (e.g. "Python") |
| `icon` | Icon identifier |
| `proficiency` | Optional numeric level; interpretation (e.g. 0–100) is left to the UI |
| `display_order` | Sort order within the category |
| `published` | Whether it's visible on the public site |

### `experience`
Work history entries.

| Column | Purpose |
| --- | --- |
| `company` | Employer name |
| `role` | Job title |
| `company_logo_url` | Employer logo |
| `location` | Office/remote location |
| `employment_type` | Free-text (e.g. "full_time", "internship") |
| `start_date` / `end_date` | `end_date` is `NULL` while ongoing |
| `is_current` | Whether this is the current role — a check constraint (`experience_current_has_no_end_date`) requires `end_date` to be `NULL` whenever this is true |
| `description` | Summary of the role |
| `responsibilities` | `text[]` of bullet points |
| `technologies` | `text[]` of tools/stack used |
| `link_url` | Company site or reference link |
| `display_order` / `published` | Standard ordering/draft controls |

### `education`
Same shape as `experience`, for academic history.

| Column | Purpose |
| --- | --- |
| `institution` | School/university name |
| `degree` | e.g. "B.Tech" |
| `field_of_study` | e.g. "Computer Science" |
| `institution_logo_url` | Institution logo |
| `start_date` / `end_date` | Enrollment period |
| `grade` | GPA/percentage/grade, free-text |
| `description` | Notable coursework, honors, etc. |
| `link_url` | Institution site or reference link |
| `display_order` / `published` | Standard ordering/draft controls |

### `projects`
The core portfolio entity. `slug` is `UNIQUE NOT NULL`; a second unique index
on `lower(slug)` additionally catches case-only duplicates (e.g. `My-Project`
vs `my-project`) that the plain constraint wouldn't.

| Column | Purpose |
| --- | --- |
| `slug` | URL identifier, e.g. `/projects/customer-churn-prediction` |
| `name` | Display title |
| `short_description` | Card/list summary |
| `description` | Full write-up |
| `problem_statement` / `solution` / `purpose` | Case-study structure: what was wrong, what was built, why it mattered |
| `logo_url` / `cover_image_url` | Imagery |
| `github_url` / `demo_url` / `video_url` | External links |
| `status` | `project_status` enum: `planned`, `in_progress`, `completed`, `archived` |
| `start_date` / `end_date` | Project timeline |
| `featured` | Surfaces the project in a "featured" section |
| `display_order` / `published` | Standard ordering/draft controls |

Child tables, all `project_id → projects.id ON DELETE CASCADE` — deleting a
project removes its technologies, features, and media with it:

**`project_technologies`** — one row per tech/tool used.
`name`, `icon`, `display_order`.

**`project_features`** — one row per notable feature.
`title`, `description`, `display_order`.

**`project_media`** — screenshots, diagrams, videos, documents attached to a
project. `file_url` (public URL), `storage_path` (Supabase Storage object
path, for management/deletion), `media_type` (`image`, `video`, `gif`,
`diagram`, `document`), `title`, `alt_text`, `caption`, `display_order`.

### `certifications`

| Column | Purpose |
| --- | --- |
| `name` | Certification name |
| `issuing_organization` | Issuer |
| `organization_logo_url` | Issuer logo |
| `issue_date` / `expiration_date` | Validity window |
| `credential_id` | Issuer's credential/reference ID |
| `credential_url` | Verification link |
| `certificate_file_url` | Certificate document/image |
| `description` | Optional supporting copy |
| `display_order` / `published` | Standard ordering/draft controls |

### `achievements`
Awards, publications, talks — anything notable that isn't a job, degree, or
certification.

| Column | Purpose |
| --- | --- |
| `title` | Achievement name |
| `description` | Details |
| `date` | When it happened |
| `organization` | Awarding/hosting body |
| `image_url` | Supporting image |
| `document_url` | Supporting document (e.g. a paper) |
| `external_link` | Reference link |
| `display_order` / `published` | Standard ordering/draft controls |

### `blog_posts` — reserved, no UI yet
The table exists so the schema doesn't need a breaking migration when a blog
is eventually built, but no route or component reads from it yet, and
`site_settings.feature_flags.blog_enabled` defaults to `false`.

Uses a `status` enum (`draft` / `published`) instead of the usual boolean —
blog posts have an explicit editorial workflow, not just a visibility toggle.

| Column | Purpose |
| --- | --- |
| `title` | Post title |
| `slug` | Unique URL identifier |
| `excerpt` | List/preview summary |
| `content` | Full post body |
| `cover_image_url` | Header image |
| `category` | Free-text category |
| `tags` | `text[]` of tags |
| `author` | Free-text author name |
| `reading_time` | Estimated minutes to read |
| `published_at` | Set when the post is published; `NULL` for drafts |
| `status` | `draft` or `published` |
| `display_order` | Sort order |

### `contact_links`
Contact methods rendered on the site (email, social, etc.).

| Column | Purpose |
| --- | --- |
| `label` | Display label (e.g. "Email") |
| `type` | `contact_type` enum: `email`, `linkedin`, `github`, `whatsapp`, `twitter`, `other` |
| `value` | Raw value (email address, handle, phone number) |
| `url` | Clickable link (e.g. `mailto:`, profile URL) |
| `icon` | Icon identifier |
| `display_order` / `published` | Standard ordering/draft controls |

### `resumes`
Uploaded resume files. Exactly one row may have `is_active = true`, enforced
by a partial unique index (`resumes_single_active_idx`) on `is_active` scoped
to `WHERE is_active` — a second active row collides on the indexed value.
Deactivating the current resume and activating another is two `UPDATE`s, not
a `DELETE` + `INSERT`, so history of past versions is kept.

| Column | Purpose |
| --- | --- |
| `file_url` | Public URL to the resume file |
| `storage_path` | Supabase Storage object path |
| `version_label` | Free-text version marker (e.g. "v2 — 2026") |
| `is_active` | Whether this is the resume currently linked/downloadable on the site |
| `uploaded_at` | When this version was uploaded |

### `site_settings`
The other single-row table, enforced the same way as `profile`
(`is_singleton`).

| Column | Purpose |
| --- | --- |
| `site_title` | `<title>` / branding text |
| `meta_description` | Default meta description |
| `og_image_url` | Default Open Graph image |
| `primary_nav` | `jsonb` array of `{label, href}` nav entries |
| `feature_flags` | `jsonb` object, e.g. `{"blog_enabled": false}` |
| `analytics_enabled` | Whether analytics scripts should load |

## Relationships

```
skill_categories 1───* skills

projects 1───* project_technologies
projects 1───* project_features
projects 1───* project_media

profile, site_settings          — standalone, single row each
experience, education,
certifications, achievements,
contact_links, blog_posts, resumes — standalone
```

## Rules

- **Single-row tables** (`profile`, `site_settings`): enforced by
  `is_singleton boolean unique check (is_singleton)`. Always `UPDATE` the
  existing row — never `INSERT` a second one.
- **Single active resume**: enforced by a partial unique index on
  `resumes.is_active`. To change the active resume: `UPDATE` the old active
  row to `is_active = false` first, then either `UPDATE` the new row to
  `is_active = true` or `INSERT` it as active.
- **Draft vs. published**: tables with a `published` boolean are never
  queried without `WHERE published = true` on the public site. `blog_posts`
  uses `status IN ('draft', 'published')` for the same purpose, plus
  `published_at` for when it went live.
- **Slugs**: `projects.slug` and `blog_posts.slug` are unique. `projects` also
  guards against case-only duplicates via a unique index on `lower(slug)`.
  Use `public.slugify(name)` to derive a slug from a title.
- **Cascades**: deleting a project deletes its technologies/features/media.
  Deleting a skill category is blocked while it still has skills.

## RLS policies

Row Level Security is on for **every** table in `public`, with no exceptions,
and it is the site's real access boundary — not a filter in the frontend.
The frontend never receives a draft row to filter.

### The shape, repeated everywhere

For each publishable content table, two policies:

```sql
-- Anyone (signed in or not) may read rows that are published.
create policy <table>_public_read on public.<table>
  for select to anon, authenticated using (published);

-- The admin may do anything, including to unpublished rows.
create policy <table>_admin_all on public.<table>
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

`blog_posts` uses `status = 'published'` in place of the boolean.
`profile`, `site_settings` and other non-publishable tables use the same
admin policy with a read policy suited to the table.

### `is_admin()` and `private.admins`

"Admin" is a row in `private.admins` referencing an `auth.users` id — an
allowlist table, not a JWT claim. `is_admin()` is a `security definer`
function that checks it. The reasoning for an allowlist over a claim is in
[docs/architecture.md](./architecture.md#what-admin-means); the short version
is that a claim is baked into a token at sign-in and cannot be revoked until
that token expires, whereas deleting a row takes effect on the next query.

`private.admins.user_id` has `on delete cascade` from `auth.users`.

### GRANT and RLS are two separate layers

This trips people up, and has cost this project real time twice.

A policy only takes effect once the role has the underlying SQL privilege to
attempt the operation at all. On this stack, a newly created table is **not**
automatically granted to `anon`/`authenticated` — by default they get
`TRUNCATE`/`REFERENCES`/`TRIGGER`/`MAINTAIN`, not
`SELECT`/`INSERT`/`UPDATE`/`DELETE`. So every table needs explicit `GRANT`s
*and* policies. Missing the grant produces `42501 permission denied for
table x`, which reads like an RLS problem and is not one.

The same blind spot hid a second bug for nine phases: `service_role` was
never granted anything, so `SUPABASE_SERVICE_ROLE_KEY` did not actually work
against any content table despite `lib/supabase/admin.ts` documenting itself
as bypassing RLS. Nothing noticed until Phase 25's backup script became the
first thing to genuinely use it. Fixed in
`20260822120000_service_role_grants.sql`, which also sets
`alter default privileges` so a future table doesn't repeat it.

Current grants:

| Role | Privileges on content tables |
| --- | --- |
| `anon` | `select` (policies then restrict to published rows) |
| `authenticated` | `select, insert, update, delete` (policies then require `is_admin()` for writes) |
| `service_role` | `select, insert, update, delete` — and bypasses RLS entirely, by virtue of `BYPASSRLS` |

### Storage

`storage.objects` carries the same public-read/admin-write shape across all
nine buckets, written as four policies covering every bucket rather than four
per bucket. Full detail in
[docs/architecture.md](./architecture.md#storage-policy-model).

One quirk recorded in the migration itself: `alter table storage.objects
enable row level security` fails with `insufficient_privilege` on a real
Supabase project, because that table is owned by `supabase_storage_admin` and
RLS is already on there. The statement is wrapped in an exception-swallowing
`do` block so it still works on a bare Postgres container where it *is*
needed.

### Proving it, rather than believing it

[`tests/database/rls-check.sql`](../tests/database/rls-check.sql) seeds a
published and an unpublished row per table and asserts the whole model as
`anon`, as an ordinary authenticated user, and as the admin. It runs inside a
transaction that always rolls back, so it is safe against any environment
including production:

```bash
psql "<connection-string>" -v ON_ERROR_STOP=1 -f tests/database/rls-check.sql
```

## Migration process

### Writing one

1. `npx supabase migration new <snake_case_name>` — creates a timestamped
   file in `supabase/migrations/`.
2. Write forward-only SQL. **There are no `down` migrations in this project**,
   deliberately: a wrong `down` is more dangerous than no `down`, and
   reversing a schema change means writing a new forward migration.
3. A new table needs all four of: the table, `enable row level security`, its
   policies, and its `GRANT`s. Three out of four is a bug, and which bug you
   get depends on which one you missed.
4. A new Storage bucket means dropping and recreating the four
   `portfolio_buckets_*` policies with the bucket added to their lists —
   follow `20260818091500_settings_storage_bucket.sql`.

### Applying it locally

```bash
npx supabase db reset
```

This drops the database, replays every migration from scratch, and runs
`seed.sql`. Replaying from scratch is the point — it verifies the migrations
work on a fresh project, which is the only thing that matters when you point
them at production.

**`db reset` also wipes `auth.users` and `private.admins`**, so it destroys
your local admin account. Budget for recreating it; see
[docs/development.md](./development.md#getting-a-working-environment).

Then regenerate the types, which are derived and never hand-written:

```bash
npx supabase gen types typescript --local > types/database.ts
```

### Applying it to production

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

`db push` applies only migrations the remote project hasn't recorded. **Never
run `db reset` against a linked remote project** — it will destroy that
project's data, and it will also run `seed.sql`, inserting placeholder rows
into your real site.

Take a backup first if the migration drops or rewrites anything:

```bash
npx supabase db dump --linked -f before-<migration>.sql
```

See [docs/deployment.md](./deployment.md#backups).

### Don't forget the backup script

A new content table must also be added to `TABLES` in
[`scripts/export-content.ts`](../scripts/export-content.ts), in FK-safe
position. A table missing from that list is silently absent from every
backup — which you discover at the worst possible moment.

## Seed data

[`supabase/seed.sql`](../supabase/seed.sql) inserts one realistic placeholder
row per table (marked `published` where applicable) so the frontend has
something to render in later phases before real content is entered. It's
applied automatically by `supabase db reset` and is not idempotent — it
expects to run against empty tables.
