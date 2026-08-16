# Database

The schema is defined entirely by the migration in
[`supabase/migrations/20260816102304_create_content_schema.sql`](../supabase/migrations/20260816102304_create_content_schema.sql).
This document explains what's in it. If the two ever disagree, the migration
is correct and this file is stale — fix the file, don't trust it blindly.

Per [CLAUDE.md](../CLAUDE.md), every schema change is a new migration file.
Nothing here is ever hand-edited in the Supabase dashboard.

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

## Seed data

[`supabase/seed.sql`](../supabase/seed.sql) inserts one realistic placeholder
row per table (marked `published` where applicable) so the frontend has
something to render in later phases before real content is entered. It's
applied automatically by `supabase db reset` and is not idempotent — it
expects to run against empty tables.
