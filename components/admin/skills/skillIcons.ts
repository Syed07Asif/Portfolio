/**
 * Mirrors components/sections/SkillsContent.tsx's `CATEGORY_ICONS` allow-list
 * (kept as plain slug strings here rather than importing that file — it's a
 * client component pulling in `motion/react`, and admin/ shouldn't depend on
 * sections/ per CLAUDE.md's admin/public boundary). Listed here purely as
 * copy for the icon field's hint text — the public site falls back to a
 * generic icon for anything outside this list rather than breaking, so this
 * isn't validated against, just documented so the admin knows which slugs
 * actually render as themselves.
 */
export const SKILL_CATEGORY_ICON_SLUGS = [
  "brain-circuit",
  "code",
  "database",
  "server",
  "cloud",
  "workflow",
  "wrench",
  "terminal",
  "cpu",
  "git-branch",
  "settings",
  "bar-chart",
  "boxes",
  "gauge",
  "layers",
] as const;
