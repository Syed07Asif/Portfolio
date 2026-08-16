# styles/

Global CSS and design tokens.

- `globals.css` — imported once from `app/layout.tsx`. Imports Tailwind, `tokens.css`, and maps every token into Tailwind v4's `@theme inline` block — that block *is* the Tailwind config (no `tailwind.config.ts`; see [docs/architecture.md](../docs/architecture.md)'s Design System section for why).
- `tokens.css` — every color, type size, spacing/radius/shadow scale, border width, and motion duration/easing as a CSS custom property on `:root`. The site is dark-mode-only for now, but because components only ever reference these tokens through Tailwind's generated utility classes (`bg-background`, `text-h2`, `rounded-lg`, `ease-out-expo`, ...), a future light theme is a matter of adding a second token set — not touching component code.

Never write an arbitrary/hardcoded value (`bg-[#1a1f38]`, `p-[18px]`, ...) in a component — add or reuse a token here instead. See every token rendered live at `/styleguide`.
