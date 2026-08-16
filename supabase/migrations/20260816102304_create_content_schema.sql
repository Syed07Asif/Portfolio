-- Phase 2: full content model for the portfolio.
-- Every table here is what the public site and admin panel read from and
-- write to — see docs/database.md for the entity-relationship overview.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keeps `updated_at` current on every UPDATE. Attached to every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Generates a URL-safe slug from arbitrary text: lowercases, replaces runs of
-- non-alphanumeric characters with a single hyphen, and trims leading/trailing
-- hyphens. Not wired into a trigger — callers (admin UI, seed data) decide
-- when to derive a slug from a name.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type project_status as enum ('planned', 'in_progress', 'completed', 'archived');
create type media_type as enum ('image', 'video', 'gif', 'diagram', 'document');
create type blog_status as enum ('draft', 'published');
create type contact_type as enum ('email', 'linkedin', 'github', 'whatsapp', 'twitter', 'other');

-- ---------------------------------------------------------------------------
-- 1. profile — single row
-- ---------------------------------------------------------------------------

create table public.profile (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  headline text,
  short_bio text,
  long_bio text,
  avatar_url text,
  location text,
  availability_status text,
  "current_role" text,
  tagline text,
  -- `is_singleton` is always true and unique, so a second INSERT violates the
  -- unique constraint — the standard Postgres trick for a single-row table.
  is_singleton boolean not null default true unique check (is_singleton),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profile_updated_at
before update on public.profile
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. skill_categories
-- ---------------------------------------------------------------------------

create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_skill_categories_updated_at
before update on public.skill_categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. skills
-- ---------------------------------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.skill_categories(id) on delete restrict,
  name text not null,
  icon text,
  proficiency integer,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_skills_updated_at
before update on public.skills
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. experience
-- ---------------------------------------------------------------------------

create table public.experience (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  company_logo_url text,
  location text,
  employment_type text,
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  description text,
  responsibilities text[],
  technologies text[],
  link_url text,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_current_has_no_end_date check (not is_current or end_date is null)
);

create trigger trg_experience_updated_at
before update on public.experience
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. education
-- ---------------------------------------------------------------------------

create table public.education (
  id uuid primary key default gen_random_uuid(),
  institution text not null,
  degree text not null,
  field_of_study text,
  institution_logo_url text,
  start_date date,
  end_date date,
  grade text,
  description text,
  link_url text,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_education_updated_at
before update on public.education
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  problem_statement text,
  solution text,
  purpose text,
  logo_url text,
  cover_image_url text,
  github_url text,
  demo_url text,
  video_url text,
  status project_status not null default 'planned',
  start_date date,
  end_date date,
  featured boolean not null default false,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Case-insensitive duplicate-slug protection on top of the UNIQUE(slug)
-- constraint above (e.g. "My-Project" vs "my-project").
create unique index projects_slug_lower_unique_idx on public.projects (lower(slug));

-- ---------------------------------------------------------------------------
-- 7. project_technologies
-- ---------------------------------------------------------------------------

create table public.project_technologies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  icon text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_project_technologies_updated_at
before update on public.project_technologies
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. project_features
-- ---------------------------------------------------------------------------

create table public.project_features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_project_features_updated_at
before update on public.project_features
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. project_media
-- ---------------------------------------------------------------------------

create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_url text not null,
  storage_path text,
  media_type media_type not null,
  title text,
  alt_text text,
  caption text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_project_media_updated_at
before update on public.project_media
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. certifications
-- ---------------------------------------------------------------------------

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  issuing_organization text not null,
  organization_logo_url text,
  issue_date date,
  expiration_date date,
  credential_id text,
  credential_url text,
  certificate_file_url text,
  description text,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_certifications_updated_at
before update on public.certifications
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. achievements
-- ---------------------------------------------------------------------------

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date,
  organization text,
  image_url text,
  document_url text,
  external_link text,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_achievements_updated_at
before update on public.achievements
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 12. blog_posts — reserved for future use, no UI yet
-- ---------------------------------------------------------------------------

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image_url text,
  category text,
  tags text[],
  author text,
  reading_time integer,
  published_at timestamptz,
  status blog_status not null default 'draft',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 13. contact_links
-- ---------------------------------------------------------------------------

create table public.contact_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  type contact_type not null,
  value text not null,
  url text,
  icon text,
  display_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_contact_links_updated_at
before update on public.contact_links
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 14. resumes
-- ---------------------------------------------------------------------------

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  storage_path text,
  version_label text,
  is_active boolean not null default false,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_resumes_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

-- Only one resume may be active at a time: a partial unique index on a
-- column that only ever holds the value `true` within the indexed rows, so a
-- second `is_active = true` row collides with the first.
create unique index resumes_single_active_idx on public.resumes (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- 15. site_settings — single row
-- ---------------------------------------------------------------------------

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_title text not null,
  meta_description text,
  og_image_url text,
  primary_nav jsonb not null default '[]'::jsonb,
  feature_flags jsonb not null default '{"blog_enabled": false}'::jsonb,
  analytics_enabled boolean not null default false,
  is_singleton boolean not null default true unique check (is_singleton),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- projects(slug) is already indexed by the UNIQUE(slug) constraint above.

create index projects_published_display_order_idx on public.projects (published, display_order);
create index project_media_project_display_order_idx on public.project_media (project_id, display_order);
create index skills_category_display_order_idx on public.skills (category_id, display_order);

-- FK lookup support for the other project child tables.
create index project_technologies_project_id_idx on public.project_technologies (project_id);
create index project_features_project_id_idx on public.project_features (project_id);

-- display_order index for every ordered table.
create index skill_categories_display_order_idx on public.skill_categories (display_order);
create index skills_display_order_idx on public.skills (display_order);
create index experience_display_order_idx on public.experience (display_order);
create index education_display_order_idx on public.education (display_order);
create index projects_display_order_idx on public.projects (display_order);
create index project_technologies_display_order_idx on public.project_technologies (display_order);
create index project_features_display_order_idx on public.project_features (display_order);
create index project_media_display_order_idx on public.project_media (display_order);
create index certifications_display_order_idx on public.certifications (display_order);
create index achievements_display_order_idx on public.achievements (display_order);
create index blog_posts_display_order_idx on public.blog_posts (display_order);
create index contact_links_display_order_idx on public.contact_links (display_order);
