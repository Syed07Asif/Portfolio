-- Phase 21: atomic single-active-resume swap.
--
-- resumes.is_active is already constrained to at most one true row by the
-- partial unique index from 20260816102304_create_content_schema.sql
-- (resumes_single_active_idx). But *setting* a new active resume still
-- needs "deactivate every other active row, then activate this one" done as
-- one atomic unit — never as two separate round trips from the admin panel
-- (deactivate-then-activate as two independent Supabase calls), which could
-- leave zero rows active if the process were interrupted between them. A
-- single Postgres function call is one implicit transaction, so both
-- UPDATEs inside it commit or roll back together for free — see
-- docs/content-management.md's Resume section for how the admin action
-- calls this via supabase.rpc(...) instead of two .update() calls.

create or replace function public.set_active_resume(resume_id uuid)
returns void
language plpgsql
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change the active resume';
  end if;

  if not exists (select 1 from public.resumes where id = resume_id) then
    raise exception 'Resume % does not exist', resume_id;
  end if;

  update public.resumes set is_active = false where is_active = true and id <> resume_id;
  update public.resumes set is_active = true where id = resume_id and is_active = false;
end;
$$;

grant execute on function public.set_active_resume(uuid) to authenticated;
