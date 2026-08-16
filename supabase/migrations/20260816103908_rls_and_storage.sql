-- Phase 3: make the database and storage safe by default.
--
-- Enables Row Level Security on every table created in
-- 20260816102304_create_content_schema.sql (never edited directly — schema
-- changes are additive migrations only, per CLAUDE.md), defines what "admin"
-- means, and locks down Supabase Storage the same way. See
-- docs/architecture.md's Security section for the model this implements.

-- ---------------------------------------------------------------------------
-- Admin identity
-- ---------------------------------------------------------------------------
-- `private` is a schema PostgREST never exposes (only schemas listed in the
-- project's API settings are reachable over the API — `public` is exposed,
-- `private` deliberately isn't), so this allowlist can't be queried directly
-- by anon or authenticated even though RLS below also locks it down.

create schema if not exists private;

create table private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.admins enable row level security;
-- No policies at all: nobody can read or write this table through the API,
-- including the admin themselves. It's only ever touched via the SQL editor
-- or a migration — see docs/deployment.md for how a user_id gets added.

-- `security definer` lets this function read private.admins on the caller's
-- behalf despite the caller having no grant on that table — it runs with the
-- privileges of the function's owner (the migration role), not the caller.
-- `auth.uid()` still reflects whichever user is actually calling it, so this
-- doesn't widen who counts as admin, only who can ask the question.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, auth
as $$
  select exists (
    select 1 from private.admins where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: every Phase 2 table
-- ---------------------------------------------------------------------------
-- Two-policy pattern repeated per table:
--   1. a `select`-only policy letting anon + authenticated read public rows
--   2. a `for all` policy letting the admin (is_admin()) do everything
-- Anon has no insert/update/delete policy anywhere, so those commands are
-- denied by RLS's default-deny regardless of table-level grants.

alter table public.profile enable row level security;
create policy profile_public_read on public.profile
  for select to anon, authenticated using (true);
create policy profile_admin_all on public.profile
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.skill_categories enable row level security;
create policy skill_categories_public_read on public.skill_categories
  for select to anon, authenticated using (true);
create policy skill_categories_admin_all on public.skill_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.skills enable row level security;
create policy skills_public_read on public.skills
  for select to anon, authenticated using (published = true);
create policy skills_admin_all on public.skills
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.experience enable row level security;
create policy experience_public_read on public.experience
  for select to anon, authenticated using (published = true);
create policy experience_admin_all on public.experience
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.education enable row level security;
create policy education_public_read on public.education
  for select to anon, authenticated using (published = true);
create policy education_admin_all on public.education
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.projects enable row level security;
create policy projects_public_read on public.projects
  for select to anon, authenticated using (published = true);
create policy projects_admin_all on public.projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Child tables: visible publicly only through their parent project, checked
-- with an EXISTS subquery so the rule lives in the database, not in every
-- caller that happens to query these tables.
alter table public.project_technologies enable row level security;
create policy project_technologies_public_read on public.project_technologies
  for select to anon, authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_technologies.project_id and p.published = true
    )
  );
create policy project_technologies_admin_all on public.project_technologies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.project_features enable row level security;
create policy project_features_public_read on public.project_features
  for select to anon, authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_features.project_id and p.published = true
    )
  );
create policy project_features_admin_all on public.project_features
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.project_media enable row level security;
create policy project_media_public_read on public.project_media
  for select to anon, authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_media.project_id and p.published = true
    )
  );
create policy project_media_admin_all on public.project_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.certifications enable row level security;
create policy certifications_public_read on public.certifications
  for select to anon, authenticated using (published = true);
create policy certifications_admin_all on public.certifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.achievements enable row level security;
create policy achievements_public_read on public.achievements
  for select to anon, authenticated using (published = true);
create policy achievements_admin_all on public.achievements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- blog_posts uses status instead of published — see docs/database.md.
alter table public.blog_posts enable row level security;
create policy blog_posts_public_read on public.blog_posts
  for select to anon, authenticated using (status = 'published');
create policy blog_posts_admin_all on public.blog_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.contact_links enable row level security;
create policy contact_links_public_read on public.contact_links
  for select to anon, authenticated using (published = true);
create policy contact_links_admin_all on public.contact_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.resumes enable row level security;
create policy resumes_public_read on public.resumes
  for select to anon, authenticated using (is_active = true);
create policy resumes_admin_all on public.resumes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- site_settings: no public select policy on the base table at all — direct
-- queries to it return zero rows for anon/authenticated non-admins. Public
-- access to the safe subset of columns goes through the view below instead.
alter table public.site_settings enable row level security;
create policy site_settings_admin_all on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Column-level redaction: RLS is row-level, so hiding specific *columns*
-- (id, is_singleton, created_at, updated_at are internal bookkeeping) needs a
-- view. This view is owned by the migration role, which owns site_settings
-- and is therefore exempt from its RLS (Postgres exempts table owners from
-- RLS unless FORCE ROW LEVEL SECURITY is set) — so it can read the row even
-- though anon has no policy on the base table, while only ever exposing the
-- columns listed here.
create view public.public_site_settings as
select site_title, meta_description, og_image_url, primary_nav, feature_flags, analytics_enabled
from public.site_settings;

grant select on public.public_site_settings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Base privilege grants
-- ---------------------------------------------------------------------------
-- RLS policies only take effect once a role has the underlying SQL
-- privilege to attempt the operation at all — GRANT and RLS are two
-- separate layers, and new tables here are NOT automatically granted to
-- anon/authenticated (verified against a real local Supabase stack: by
-- default they get TRUNCATE/REFERENCES/TRIGGER/MAINTAIN, not
-- SELECT/INSERT/UPDATE/DELETE), so every table needs this explicitly. RLS
-- above remains the real access boundary — anon gets SELECT on
-- site_settings here too, but still sees zero rows there since no anon
-- policy exists on that table.

grant select on
  public.profile,
  public.skill_categories,
  public.skills,
  public.experience,
  public.education,
  public.projects,
  public.project_technologies,
  public.project_features,
  public.project_media,
  public.certifications,
  public.achievements,
  public.blog_posts,
  public.contact_links,
  public.resumes,
  public.site_settings
to anon, authenticated;

grant insert, update, delete on
  public.profile,
  public.skill_categories,
  public.skills,
  public.experience,
  public.education,
  public.projects,
  public.project_technologies,
  public.project_features,
  public.project_media,
  public.certifications,
  public.achievements,
  public.blog_posts,
  public.contact_links,
  public.resumes,
  public.site_settings
to authenticated;

-- So a future table added in a later migration doesn't silently repeat this.
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
-- One bucket per content area, all public-read (served straight from the
-- public object URL) with a MIME allowlist and size cap matching what that
-- area actually stores.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile', 'profile', true, 5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('projects', 'projects', true, 52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf']),
  ('certifications', 'certifications', true, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('achievements', 'achievements', true, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('experience', 'experience', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('education', 'education', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('resume', 'resume', true, 10485760,
    array['application/pdf']),
  ('blog', 'blog', true, 5242880,
    array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies
-- ---------------------------------------------------------------------------
-- Same public-read / admin-write rule as the content tables, applied once
-- across all eight buckets rather than repeated per bucket. RLS on
-- storage.objects is enabled by default on every real Supabase project
-- (owned by supabase_storage_admin, not the migration role), so attempting
-- the ALTER there fails with "must be owner of table objects" — caught and
-- ignored below. It only actually runs on local/self-hosted Postgres
-- instances (e.g. a bare postgres:16 container) where the migration role
-- does own the table and RLS isn't on yet.
do $$
begin
  begin
    alter table storage.objects enable row level security;
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

create policy portfolio_buckets_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog'));

create policy portfolio_buckets_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog')
    and public.is_admin()
  );

create policy portfolio_buckets_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog')
    and public.is_admin()
  )
  with check (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog')
    and public.is_admin()
  );

create policy portfolio_buckets_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog')
    and public.is_admin()
  );
