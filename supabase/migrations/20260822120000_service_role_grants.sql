-- Phase 25: give `service_role` the table privileges it has never had.
--
-- ## The gap
--
-- 20260816103908_rls_and_storage.sql granted SELECT to `anon` and
-- SELECT/INSERT/UPDATE/DELETE to `authenticated`, explicitly, for the
-- reason documented there: on this stack a newly created table is NOT
-- automatically granted to those roles. It never granted anything to
-- `service_role`, and nothing noticed for nine phases because nothing
-- actually used the service-role key against a content table —
-- lib/supabase/admin.ts exists and is imported by exactly one test, and
-- that test deliberately writes through a signed-in admin session instead
-- (see tests/lib/data/published.test.ts's own comment, which records this
-- gap as "latent rather than live" when Phase 24 found it).
--
-- Phase 25 makes it live. `scripts/export-content.ts` has to read every
-- row including unpublished drafts, which is precisely what the anon and
-- authenticated paths are designed *not* to allow, so it uses the
-- service-role key — and got `42501 permission denied for table profile`
-- on its very first run.
--
-- ## Why granting is the right fix
--
-- `service_role` is reachable only by presenting SUPABASE_SERVICE_ROLE_KEY.
-- That key is server-only: lib/supabase/admin.ts imports `server-only` so
-- a client-component import is a build error, and Phase 25 confirmed the
-- key's literal value appears nowhere in a production build's client
-- bundles. So this grant widens nothing that a visitor can reach — it only
-- makes the credential that already claims full access actually have it.
--
-- It also removes a real trap: `createAdminClient()` documents itself as
-- "bypasses Row Level Security entirely," and a future maintainer reaching
-- for it would have hit the same opaque 42501 with no hint that the cause
-- was a missing GRANT rather than an RLS policy.
--
-- ## Why it is written out rather than left to defaults
--
-- On hosted Supabase, tables created by the `postgres` role usually pick
-- up service_role privileges from Supabase's own ALTER DEFAULT PRIVILEGES.
-- "Usually" is doing too much work in a file whose entire job is to make
-- access deterministic — and the observed behaviour on this project's own
-- local stack is that they do not. Stating it explicitly costs one
-- statement, is idempotent where the privilege already exists, and makes
-- local and hosted behave identically instead of differing in a way that
-- only shows up the first time someone runs a backup against production.
--
-- RLS is unaffected: `service_role` carries BYPASSRLS, so the policies in
-- 20260816103908 remain the access boundary for `anon` and
-- `authenticated`, which is every request that originates in a browser.

grant select, insert, update, delete on
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
to service_role;

-- The read-only view the public site uses for settings. Included so a
-- backup or an admin-side read of "everything" does not hit a hole here.
grant select on public.public_site_settings to service_role;

-- Sequences: none of the content tables use one today (every primary key
-- is a uuid default), but granting on the schema's sequences costs nothing
-- and means a future table with a bigserial key does not reintroduce
-- exactly this bug from exactly this blind spot.
grant usage, select on all sequences in schema public to service_role;

-- The atomic resume swap (20260818090000). `authenticated` already has
-- execute; service_role needs it too for any operational script that has
-- to promote a resume without a browser session.
grant execute on function public.set_active_resume(uuid) to service_role;

-- So a table added by a future migration doesn't silently repeat this —
-- the same safety net 20260816103908 put in place for anon/authenticated.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
