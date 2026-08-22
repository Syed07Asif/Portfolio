-- Phase 21: a storage bucket for site_settings' default OG image.
--
-- Every other content area already has its own bucket (see
-- 20260816103908_rls_and_storage.sql) — site_settings didn't need one until
-- now, since Settings is the first phase to add an upload to it. Same
-- public-read / admin-write policy shape as every existing bucket, just
-- extended to include this one rather than duplicated.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('settings', 'settings', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists portfolio_buckets_public_read on storage.objects;
create policy portfolio_buckets_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog', 'settings'));

drop policy if exists portfolio_buckets_admin_insert on storage.objects;
create policy portfolio_buckets_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog', 'settings')
    and public.is_admin()
  );

drop policy if exists portfolio_buckets_admin_update on storage.objects;
create policy portfolio_buckets_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog', 'settings')
    and public.is_admin()
  )
  with check (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog', 'settings')
    and public.is_admin()
  );

drop policy if exists portfolio_buckets_admin_delete on storage.objects;
create policy portfolio_buckets_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('profile', 'projects', 'certifications', 'achievements', 'experience', 'education', 'resume', 'blog', 'settings')
    and public.is_admin()
  );
