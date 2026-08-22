# components/

React components, split by role:

- `ui/` — generic, content-agnostic primitives (buttons, cards, inputs). Mostly shadcn/ui-generated.
- `sections/` — public-site sections composed from content fetched via `lib/` (hero, projects grid, experience timeline, etc.).
- `admin/` — admin panel UI for editing content (forms, tables, dashboards).
- `layout/` — shared chrome: header, footer, nav, page shells.
- `motion/` — `MotionProvider`, mounted once in `app/layout.tsx`, that makes `prefers-reduced-motion` automatic for every Framer Motion animation in the app. Reusable animation variants themselves live in `lib/motion.ts`, not here.

Components are PascalCase (`ProjectCard.tsx`). A component never contains its own copy of content that belongs in the database — it receives content as props.
