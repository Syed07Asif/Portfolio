# app/

Next.js App Router routes. Two route groups live here:

- **Public site** — the portfolio itself (home, projects, experience, etc.). These pages read content from Supabase via `lib/`; they never hard-code project/job/skill data.
- **`/admin`** — the authenticated admin panel (added in a later phase) used to manage that content.

Route segments are kebab-case (e.g. `app/case-studies/[slug]/page.tsx`). Keep route files thin — page/layout components should compose from `components/sections` and `components/admin`, not contain business logic.
