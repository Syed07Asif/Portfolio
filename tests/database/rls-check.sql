-- Proves the Row Level Security policies from
-- supabase/migrations/20260816103908_rls_and_storage.sql actually do what
-- they claim: the anon role can read published rows and nothing else, child
-- rows follow their parent project's published state, and anon can never
-- write. Everything below runs inside a transaction that is always rolled
-- back at the end, so this is safe to run against any environment,
-- including production.
--
-- Run: psql "<connection-string>" -v ON_ERROR_STOP=1 -f tests/database/rls-check.sql
-- Requires: migrations up to and including 20260816103908_rls_and_storage.sql
-- already applied, and an `anon` role that exists (true on every Supabase
-- project; see supabase/README.md if running against plain Postgres).

begin;

-- ---------------------------------------------------------------------------
-- Arrange — one published + one unpublished row per policy-bearing table,
-- inserted as the table owner (bypasses RLS). Fixed test UUIDs make the
-- assertions below unambiguous; the whole block is discarded by the final
-- ROLLBACK regardless of outcome.
-- ---------------------------------------------------------------------------

insert into public.skill_categories (id, name, slug)
values ('a0000000-0000-4000-8000-000000000001', 'RLS Test Category', 'rls-test-category');

insert into public.skills (id, category_id, name, published) values
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Published Skill', true),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Unpublished Skill', false);

insert into public.experience (id, company, role, start_date, published) values
  ('a0000000-0000-4000-8000-000000000004', 'RLS Test Co', 'Published Role', '2024-01-01', true),
  ('a0000000-0000-4000-8000-000000000005', 'RLS Test Co', 'Unpublished Role', '2024-01-01', false);

insert into public.education (id, institution, degree, published) values
  ('a0000000-0000-4000-8000-000000000006', 'RLS Test University', 'Published Degree', true),
  ('a0000000-0000-4000-8000-000000000007', 'RLS Test University', 'Unpublished Degree', false);

insert into public.projects (id, slug, name, published) values
  ('a0000000-0000-4000-8000-000000000008', 'rls-test-published-project', 'Published Project', true),
  ('a0000000-0000-4000-8000-000000000009', 'rls-test-unpublished-project', 'Unpublished Project', false);

-- Child rows under both: project_features/project_media share the exact same
-- policy shape (an EXISTS check against the parent's `published`), so
-- proving it here for one child table covers the pattern.
insert into public.project_technologies (id, project_id, name) values
  ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000008', 'Visible Tech'),
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000009', 'Hidden Tech');

insert into public.certifications (id, name, issuing_organization, published) values
  ('a0000000-0000-4000-8000-000000000012', 'Published Cert', 'RLS Test Org', true),
  ('a0000000-0000-4000-8000-000000000013', 'Unpublished Cert', 'RLS Test Org', false);

insert into public.achievements (id, title, published) values
  ('a0000000-0000-4000-8000-000000000014', 'Published Achievement', true),
  ('a0000000-0000-4000-8000-000000000015', 'Unpublished Achievement', false);

insert into public.blog_posts (id, title, slug, status) values
  ('a0000000-0000-4000-8000-000000000016', 'Published Post', 'rls-test-published-post', 'published'),
  ('a0000000-0000-4000-8000-000000000017', 'Draft Post', 'rls-test-draft-post', 'draft');

insert into public.contact_links (id, label, type, value, published) values
  ('a0000000-0000-4000-8000-000000000018', 'Published Link', 'other', 'x', true),
  ('a0000000-0000-4000-8000-000000000019', 'Unpublished Link', 'other', 'x', false);

insert into public.resumes (id, file_url, is_active)
values ('a0000000-0000-4000-8000-000000000020', '/rls-test-inactive.pdf', false);

-- profile / site_settings are singletons — only seed one if it's missing.
insert into public.profile (full_name)
select 'RLS Test Profile' where not exists (select 1 from public.profile);

insert into public.site_settings (site_title)
select 'RLS Test Site' where not exists (select 1 from public.site_settings);

-- ---------------------------------------------------------------------------
-- Act + assert, as anon
-- ---------------------------------------------------------------------------

set local role anon;

do $$
begin
  if not exists (select 1 from public.skills where id = 'a0000000-0000-4000-8000-000000000002') then
    raise exception 'FAIL: anon cannot see a published skill';
  end if;
  if exists (select 1 from public.skills where id = 'a0000000-0000-4000-8000-000000000003') then
    raise exception 'FAIL: anon can see an unpublished skill';
  end if;

  if exists (select 1 from public.experience where id = 'a0000000-0000-4000-8000-000000000005') then
    raise exception 'FAIL: anon can see an unpublished experience row';
  end if;

  if exists (select 1 from public.education where id = 'a0000000-0000-4000-8000-000000000007') then
    raise exception 'FAIL: anon can see an unpublished education row';
  end if;

  if exists (select 1 from public.projects where id = 'a0000000-0000-4000-8000-000000000009') then
    raise exception 'FAIL: anon can see an unpublished project';
  end if;

  if not exists (select 1 from public.project_technologies where id = 'a0000000-0000-4000-8000-000000000010') then
    raise exception 'FAIL: anon cannot see a technology row under a published project';
  end if;
  if exists (select 1 from public.project_technologies where id = 'a0000000-0000-4000-8000-000000000011') then
    raise exception 'FAIL: anon can see a technology row under an unpublished project';
  end if;

  if exists (select 1 from public.certifications where id = 'a0000000-0000-4000-8000-000000000013') then
    raise exception 'FAIL: anon can see an unpublished certification';
  end if;

  if exists (select 1 from public.achievements where id = 'a0000000-0000-4000-8000-000000000015') then
    raise exception 'FAIL: anon can see an unpublished achievement';
  end if;

  if not exists (select 1 from public.blog_posts where id = 'a0000000-0000-4000-8000-000000000016') then
    raise exception 'FAIL: anon cannot see a published blog post';
  end if;
  if exists (select 1 from public.blog_posts where id = 'a0000000-0000-4000-8000-000000000017') then
    raise exception 'FAIL: anon can see a draft blog post';
  end if;

  if exists (select 1 from public.contact_links where id = 'a0000000-0000-4000-8000-000000000019') then
    raise exception 'FAIL: anon can see an unpublished contact link';
  end if;

  if exists (select 1 from public.resumes where id = 'a0000000-0000-4000-8000-000000000020') then
    raise exception 'FAIL: anon can see an inactive resume';
  end if;

  if exists (select 1 from public.site_settings) then
    raise exception 'FAIL: anon can read the site_settings base table directly';
  end if;
  if not exists (select 1 from public.public_site_settings) then
    raise exception 'FAIL: anon cannot read public_site_settings';
  end if;

  raise notice 'PASS: anon read access matches policy for every table';
end $$;

do $$
begin
  begin
    insert into public.projects (slug, name) values ('rls-test-anon-write', 'Should Not Insert');
    raise exception 'FAIL: anon was able to INSERT into projects';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon INSERT correctly rejected';
  end;

  update public.skills set name = 'Hacked' where id = 'a0000000-0000-4000-8000-000000000002';
  if found then
    raise exception 'FAIL: anon was able to UPDATE a published skill';
  end if;

  delete from public.skills where id = 'a0000000-0000-4000-8000-000000000002';
  if found then
    raise exception 'FAIL: anon was able to DELETE a published skill';
  end if;

  raise notice 'PASS: anon cannot UPDATE or DELETE either';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Act + assert, as the admin — and as an ordinary authenticated user who
-- isn't in private.admins, to prove is_admin() actually gates on identity
-- and not just on being logged in.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values ('b0000000-0000-4000-8000-000000000001', 'admin@example.com');
insert into private.admins (user_id) values ('b0000000-0000-4000-8000-000000000001');

insert into auth.users (id, email) values ('b0000000-0000-4000-8000-000000000002', 'nonadmin@example.com');
-- deliberately not added to private.admins

set local role authenticated;
set local request.jwt.claims to '{"sub": "b0000000-0000-4000-8000-000000000001"}';

do $$
begin
  if not exists (select 1 from public.skills where id = 'a0000000-0000-4000-8000-000000000003') then
    raise exception 'FAIL: admin cannot see an unpublished skill';
  end if;

  update public.skills set name = 'Edited By Admin' where id = 'a0000000-0000-4000-8000-000000000003';
  if not found then
    raise exception 'FAIL: admin could not UPDATE an unpublished skill';
  end if;

  insert into public.achievements (title, published) values ('Admin Inserted Achievement', false);

  delete from public.achievements where title = 'Admin Inserted Achievement';
  if not found then
    raise exception 'FAIL: admin could not DELETE a row it just inserted';
  end if;

  raise notice 'PASS: admin (is_admin()) has full read/write access';
end $$;

set local request.jwt.claims to '{"sub": "b0000000-0000-4000-8000-000000000002"}';

do $$
begin
  if exists (select 1 from public.skills where id = 'a0000000-0000-4000-8000-000000000003') then
    raise exception 'FAIL: a non-admin authenticated user can see an unpublished skill';
  end if;
  raise notice 'PASS: a logged-in but non-admin user is treated the same as anon';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Act + assert — storage: same public-read / admin-write rule.
-- ---------------------------------------------------------------------------

insert into storage.objects (id, bucket_id, name)
values ('c0000000-0000-4000-8000-000000000001', 'profile', 'rls-test-avatar.png');

set local role anon;

do $$
begin
  if not exists (select 1 from storage.objects where id = 'c0000000-0000-4000-8000-000000000001') then
    raise exception 'FAIL: anon cannot read an object in a public bucket';
  end if;

  begin
    insert into storage.objects (bucket_id, name) values ('profile', 'rls-test-hacked.png');
    raise exception 'FAIL: anon was able to upload to a public bucket';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon can read storage objects but cannot upload';
  end;
end $$;

reset role;

-- Never keep any of this: discard everything inserted above.
rollback;
