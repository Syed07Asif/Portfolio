# Deployment

> Vercel project setup, per-environment env var configuration, and the
> release process are still stubs — to be filled in once a Vercel project
> exists. This file currently covers the one deployment-adjacent thing Phase
> 3 needed: provisioning the admin account.

## Admin account

There is exactly one administrator account, for Syed Asif. "Admin" is
defined by a row in `private.admins` referencing a Supabase Auth user — see
[docs/architecture.md's Security section](./architecture.md#what-admin-means)
for why it's an allowlist table rather than a custom claim. This has to be
done manually per Supabase project (dev, staging, prod are separate
projects with separate `auth.users` tables, so the same person gets a
different `user_id` in each) — it's an operational step, not something a
migration or `seed.sql` can do, since a real UUID doesn't exist until the
account is created.

### Creating the admin account

1. In the Supabase dashboard for the target project, go to **Authentication
   → Users → Add user → Invite user**, and invite Syed Asif's real email
   address. This sends an email letting him set his own password — nobody
   else (including whoever runs this step) ever needs to know it.
   (Alternatively, `supabase.auth.admin.inviteUserByEmail()` via the
   Admin API/service-role key does the same thing from a script.)
2. Once accepted, copy the new user's `id` (a UUID) from the Users table.
3. In the SQL editor for that same project, run:

   ```sql
   insert into private.admins (user_id) values ('<uuid-from-step-2>');
   ```

   That's the entire grant of admin access — `is_admin()` reads this table,
   nothing else. Do not commit this UUID anywhere in the repo; it's
   environment-specific and holds no secret value on its own, but there's no
   reason to record it outside the database that already has it.

### Rotating the admin account

- **Password reset:** Supabase dashboard → Authentication → Users → select
  the user → **Send password recovery**. No change to `private.admins`
  needed — the `user_id` doesn't change.
- **Replacing the account entirely** (e.g. a new email address): create the
  new user via the same invite flow, insert its `user_id` into
  `private.admins`, confirm access works, then remove the old row:

  ```sql
  delete from private.admins where user_id = '<old-uuid>';
  ```

  `private.admins.user_id` has `on delete cascade` from `auth.users`, so
  deleting the old Auth user (Authentication → Users → Delete) also cleans
  up its `private.admins` row automatically if that's done first instead.
- **Revoking access without deleting the account:** just delete the
  `private.admins` row. The Auth user still exists and can still log in, but
  `is_admin()` returns `false` for them everywhere, so RLS treats them like
  any other authenticated (non-admin) visitor.
