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

/**
 * Lowercase, hyphen-separated slug derivation — shared by SlugField (live,
 * client-side, as the admin types a name) and lib/actions/projects.ts
 * (server-side, deriving a fallback slug when the admin leaves it blank on
 * a draft save). Matches the shape `lib/validation/shared.ts`'s
 * `slugSchema` regex accepts and what the database's own
 * `public.slugify()` SQL function produces.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves a nav/footer href that may be a same-page anchor (`#about`) so it
 * still works from routes other than the homepage — e.g. `#about` becomes
 * `/#about` from a project detail page instead of doing nothing. Absolute
 * paths (a future non-anchor nav item like `/blog`) pass through unchanged.
 * Shared by Navbar and Footer so both resolve anchors identically.
 */
export function resolveAnchorHref(href: string, pathname: string): string {
  if (!href.startsWith("#")) return href;
  return pathname === "/" ? href : `/${href}`;
}

/**
 * Splits a long-form text field (e.g. profile.long_bio) into paragraphs on
 * blank lines. The stored value is always plain text — never HTML — so
 * callers render each paragraph as plain JSX children (React escapes it
 * automatically) rather than reaching for `dangerouslySetInnerHTML`.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Postgres `date` columns come back as plain "YYYY-MM-DD" strings. Parsing
 * that through `new Date(...)` and reading back year/month is a classic
 * off-by-one trap — `new Date("2023-06-01")` is UTC midnight, and
 * `.getMonth()`/`.getFullYear()` read it back in the *local* timezone, so
 * anyone west of UTC can see the previous day (and sometimes month/year).
 * Splitting the string directly sidesteps timezone conversion entirely.
 */
function parseYearMonth(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split("-").map(Number);
  return { year: year!, month: month! };
}

/**
 * "Mon D, YYYY" (e.g. "Aug 17, 2026") for a full `timestamptz` value — an
 * admin list's `updated_at` column, unlike `formatMonthYear` below, which
 * only handles a plain "YYYY-MM-DD" date column. Deliberately not
 * `toLocaleDateString()`: that formats using the *rendering environment's*
 * locale, which differs between the server's render pass and the
 * browser's own locale ("Aug 17, 2026" vs. "17 Aug 2026") and produces a
 * real hydration mismatch — hit live building the Projects admin table
 * (Phase 20), the same class of "don't let non-deterministic formatting
 * differ between server and client" trap this file's date helpers already
 * guard against elsewhere.
 */
export function formatAdminDate(iso: string): string {
  const date = new Date(iso);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Formats a "YYYY-MM-DD" date as "Mon YYYY", e.g. "Jun 2023". */
export function formatMonthYear(dateStr: string): string {
  const { year, month } = parseYearMonth(dateStr);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * "Mon YYYY — Mon YYYY", with the end swapped for "Present" when there's no
 * end date yet (experience.is_current, or education still in progress).
 */
export function formatDateRange(start: string, end: string | null, isCurrent = false): string {
  const endLabel = isCurrent || !end ? "Present" : formatMonthYear(end);
  return `${formatMonthYear(start)} — ${endLabel}`;
}

/**
 * For entities where *both* start and end are optional (education,
 * projects — unlike experience, which always has a start_date):
 * "Mon YYYY — Mon YYYY" when both are set, a single labeled date when only
 * one is, or `null` when neither is (the caller omits the line entirely).
 * `labels` lets each caller phrase the single-date cases in its own domain
 * language (education's "Graduated" vs. a project's "Completed") without
 * duplicating the branching logic itself.
 */
export function formatOptionalDateRange(
  start: string | null,
  end: string | null,
  labels: { start?: string; end?: string } = {},
): string | null {
  if (start && end) return formatDateRange(start, end);
  if (end) return labels.end ? `${labels.end} ${formatMonthYear(end)}` : formatMonthYear(end);
  if (start) return labels.start ? `${labels.start} ${formatMonthYear(start)}` : formatMonthYear(start);
  return null;
}

/**
 * "1 yr 3 mos" — plain elapsed-time month difference (Jan 2022 → Jan 2023
 * is a clean "1 yr", not "1 yr 1 mo"), floored at 1 month so a same-month
 * start/end reads as "1 mo" instead of the wrong-looking "0 mos" a naive
 * difference would print. Omits the years or months segment entirely when
 * it's zero (a clean multiple of 12 months reads as "1 yr", never
 * "1 yr 0 mos").
 */
export function formatDuration(start: string, end: string | null, isCurrent = false): string {
  const { year: y1, month: m1 } = parseYearMonth(start);
  let y2: number;
  let m2: number;

  if (isCurrent || !end) {
    const now = new Date();
    y2 = now.getFullYear();
    m2 = now.getMonth() + 1;
  } else {
    ({ year: y2, month: m2 } = parseYearMonth(end));
  }

  const totalMonths = Math.max(1, (y2 - y1) * 12 + (m2 - m1));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const parts = [
    years > 0 ? `${years} yr${years > 1 ? "s" : ""}` : null,
    months > 0 ? `${months} mo${months > 1 ? "s" : ""}` : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" ");
}
