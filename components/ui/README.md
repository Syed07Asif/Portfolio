# components/ui/

Generic, content-agnostic UI primitives for the **public site**. Every section in `components/sections` composes these — no section defines its own button, card, badge, etc.

Primitives: `Button`, `IconButton`, `Card`, `Section`, `Container`, `SectionHeading`, `Badge`, `Tag`, `Divider`, `Avatar`, `EmptyState`, `Skeleton`. Import from the barrel (`@/components/ui`) or a specific file.

Rules for anything added here:
- No data fetching — content arrives as props.
- No portfolio-specific copy — a primitive doesn't know it's a portfolio.
- No arbitrary Tailwind values — compose `styles/tokens.css` tokens (see [CLAUDE.md](../../CLAUDE.md)).
- Every prop is typed; every variant/state is visible at `/styleguide`.

shadcn/ui is a separate thing: it's installed into `components/admin/ui/` and is for the **admin panel and interactive overlays only** (dialog, dropdown, tabs, form, table, ...) — see that folder's README. The public site must not look like a stock shadcn site, which is also why the two live in different folders instead of shadcn's generated primitives landing here and colliding with (or visually contaminating) these hand-built ones.
