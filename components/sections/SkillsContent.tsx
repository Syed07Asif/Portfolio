import {
  BarChart3,
  Boxes,
  BrainCircuit,
  Cloud,
  Code2,
  Cpu,
  Database,
  Gauge,
  GitBranch,
  Layers,
  Server,
  Settings,
  Terminal,
  Workflow,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import type { SkillCategoryWithSkills, SkillWithCategory } from "@/types/content";

/**
 * skill_categories.icon is a freeform kebab-case string the admin types in
 * (see supabase/seed.sql, e.g. "brain-circuit") — this is a small curated
 * allow-list rather than a dynamic kebab->PascalCase lookup across all of
 * lucide-react, which would pull the entire icon set into the bundle for a
 * handful of category badges. An icon string that isn't in the list still
 * renders (falls back to `Layers`) rather than silently disappearing —
 * the admin explicitly asked for an icon, so something should show up.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "brain-circuit": BrainCircuit,
  code: Code2,
  database: Database,
  server: Server,
  cloud: Cloud,
  workflow: Workflow,
  wrench: Wrench,
  terminal: Terminal,
  cpu: Cpu,
  "git-branch": GitBranch,
  settings: Settings,
  "bar-chart": BarChart3,
  boxes: Boxes,
  gauge: Gauge,
  layers: Layers,
};

/**
 * Returns the resolved icon already wrapped in its normalized badge — a
 * plain render-helper called as `{renderCategoryIcon(...)}`, not a `<Tag />`
 * built from a locally-resolved component reference, so this doesn't read
 * (to React Compiler's `static-components` lint rule) like a component
 * being defined during render.
 */
function renderCategoryIcon(icon: string | null): ReactNode {
  if (!icon) return null;
  const Icon = CATEGORY_ICONS[icon] ?? Layers;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

/**
 * Deliberately no per-skill icons — the schema's per-skill `icon` field
 * would need resolving against brand/logo marks (React, Python, ...), which
 * this project's icon library doesn't ship (see Footer's contact-icon
 * comment from an earlier phase) and which the brief explicitly steers away
 * from anyway ("consistent typographic chips ... not a grid of mismatched
 * brand logos"). A plain text chip is the one treatment guaranteed to stay
 * uniform whether a category has 1 skill or 20.
 */
function SkillChip({ skill }: { skill: SkillWithCategory }) {
  const hasProficiency = skill.proficiency !== null;

  return (
    <li>
      <span
        tabIndex={0}
        aria-label={hasProficiency ? `${skill.name} — ${skill.proficiency}% proficiency` : undefined}
        className="relative inline-flex items-center overflow-hidden rounded-full border border-border bg-surface-raised px-4 py-2 text-small font-medium text-foreground-secondary transition-colors duration-fast ease-out-quart hover:border-accent hover:text-foreground focus-visible:border-accent focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {skill.name}
        {hasProficiency ? (
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-0.5 bg-accent/70"
            style={{ width: `${skill.proficiency}%` }}
          />
        ) : null}
      </span>
    </li>
  );
}

/**
 * The chips inside a category used to cascade in on their own, with a
 * per-instance Framer `transition` that scaled the per-item delay down as the
 * list grew (so a 20-skill category didn't take 20× as long). That second
 * level of stagger is gone with the move to CSS in Phase 24: the chips now
 * simply reveal with their card, which is itself a `.reveal-group` child one
 * level up. Nesting a second scroll-driven timeline inside an already-
 * revealing card added motion nobody could really perceive — the chips are
 * small, wrap across rows, and land within a few hundred ms of each other
 * either way — in exchange for keeping this whole subtree client-side.
 */
function CategoryCard({ category }: { category: SkillCategoryWithSkills }) {
  return (
    <div>
      <Card padding="lg" className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          {renderCategoryIcon(category.icon)}
          <div className="flex flex-col gap-1">
            <h3 className="text-h4 font-display font-semibold text-foreground">{category.name}</h3>
            {category.description ? (
              <p className="text-small text-foreground-muted">{category.description}</p>
            ) : null}
          </div>
        </div>

        <ul className="flex flex-wrap gap-2">
          {category.skills.map((skill) => (
            <SkillChip key={skill.id} skill={skill} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

export interface SkillsContentProps {
  categories: SkillCategoryWithSkills[];
}

/**
 * Two levels of stagger, both riding lib/motion.ts's existing
 * staggerContainer/staggerItem variants unmodified: categories cascade in
 * relative to each other (outer container), and each category's own skills
 * cascade in relative to each other (nested container, inheriting the
 * "visible" state from its parent once that category itself has revealed —
 * standard Framer variant propagation, no separate viewport trigger needed
 * on the inner list).
 */
export function SkillsContent({ categories }: SkillsContentProps) {
  return (
    <div
      className="reveal-group grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}
