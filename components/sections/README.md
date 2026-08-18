# components/sections/

Public-site sections (hero, about, skills, projects, experience, education, contact). A section is a Server Component that calls `lib/data/*` itself for whatever content only it needs (e.g. `Hero.tsx` calling `getProfile()`/`getActiveResume()`) — co-located fetching, not prop-drilled from `app/page.tsx`. The exception is `components/layout` (Navbar/Footer): that data (nav items, contact links) is shared across every route via `app/layout.tsx`, so it's fetched once there and passed down as props instead.

Animation and other client-only behavior lives in a small `"use client"` child the section renders (e.g. `HeroReveal.tsx`, `HeroBackground.tsx`) — the section itself stays a Server Component so its content is part of the initial HTML, not deferred behind hydration.
