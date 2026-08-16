import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doesn't know about our custom `--text-*` font-size scale
 * (styles/tokens.css: display, h1-h4, body-lg, body, small, caption) unless
 * told — without this, e.g. `text-accent-foreground text-body` on the same
 * element gets misread as two conflicting "text colour" classes (both start
 * with `text-`), and the earlier one is silently dropped. Registering these
 * under Tailwind's own `font-size` group fixes that while still correctly
 * treating two of our own scale names (e.g. `text-h2 text-h3`) as
 * conflicting with each other, which they should be.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-body-lg",
        "text-body",
        "text-small",
        "text-caption",
      ],
    },
  },
});

/**
 * Merges conditional class names (clsx) and resolves conflicting Tailwind
 * utilities in favour of the last one (tailwind-merge) — e.g.
 * `cn("p-4", condition && "p-6")` correctly yields just `p-6` when
 * `condition` is true, instead of leaving both classes in the string.
 * Used by every variant-driven primitive in components/ui and by shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
