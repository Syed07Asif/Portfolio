# styles/

Global CSS and design tokens.

- `globals.css` — imported once from `app/layout.tsx`. Imports Tailwind and `tokens.css`.
- `tokens.css` — every color used in the app as a CSS custom property (`--color-*`) on `:root`. The site is dark-mode-only for now, but because components only ever reference these tokens through Tailwind's generated utility classes (e.g. `bg-background`, `text-foreground-muted`), a future light theme is a matter of adding a second token set — not touching component code.

Never hard-code a hex/rgb color value in a component; add or reuse a token here instead.
