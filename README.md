# Syed Asif — Portfolio

A long-term professional portfolio for Syed Asif, an Analytics & ML Engineer.

**Core principle:** the code defines how the portfolio works; the database defines what it contains. Adding a project, job, skill, or certification means adding a database row — never writing new frontend code. See [CLAUDE.md](./CLAUDE.md) for the full set of project conventions.

## Stack

- [Next.js](https://nextjs.org/) (App Router) + React + TypeScript (strict)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) for admin/interactive primitives
- [Framer Motion](https://motion.dev/) for animation
- [Supabase](https://supabase.com/) for Postgres, Auth, and Storage
- [Zod](https://zod.dev/) for validation
- [Lucide](https://lucide.dev/) for icons
- npm, deployed on [Vercel](https://vercel.com/)

## Running locally

```bash
npm install
npm run dev
```

The site runs at [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # ESLint
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. Public. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key. **Server-only — never expose to the client.** |
| `NEXT_PUBLIC_SITE_URL` | Public base URL of the deployed site. |

`.env.local` is git-ignored and should never be committed.

## Admin panel

Content (projects, jobs, skills, certifications) is managed through an authenticated `/admin` panel backed by Supabase. It is not yet built — this section will be filled in once it lands.

## Project structure

See the README in each top-level folder (`app/`, `components/`, `lib/`, `types/`, `hooks/`, `styles/`, `supabase/`, `docs/`, `tests/`) for what belongs where, and [CLAUDE.md](./CLAUDE.md) for naming conventions and project-wide rules.
