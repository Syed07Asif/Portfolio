import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardHoverEffect = "none" | "lift" | "glow";

const paddingClassName: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const baseClassName = "block rounded-xl border border-border bg-surface text-left";

const interactiveClassName =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Hover treatments, as CSS rather than Framer Motion's `whileHover`.
 *
 * Every one is mirrored on `focus-visible` as well as `hover`, which is a
 * requirement rather than a nicety: a keyboard user tabbing through a grid of
 * cards must get the same affordance a mouse user gets, and on touch there is
 * no hover state at all. (The Framer version already did this via
 * `whileFocus`; it is spelled out here so the mirroring is impossible to drop
 * by accident.)
 *
 * The transform is wrapped in `motion-safe:` so `prefers-reduced-motion`
 * removes the movement entirely; the glow is not, because a shadow change is
 * not motion and remains a useful, non-animated affordance under that
 * setting. `-translate-y-1.5` is 6px — the same offset lib/motion.ts's
 * `hoverLift` used.
 */
const hoverClassName: Record<CardHoverEffect, string> = {
  none: "",
  lift: "motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-quart motion-safe:hover:-translate-y-1.5 motion-safe:focus-visible:-translate-y-1.5",
  glow: "transition-shadow duration-fast ease-out-quart hover:shadow-glow-accent-md focus-visible:shadow-glow-accent-md",
};

type CardCommonProps = {
  padding?: CardPadding;
  hover?: CardHoverEffect;
  className?: string;
  children?: ReactNode;
};

/**
 * Not interactive — a static grouping surface. Renders a <div>.
 */
type CardStaticProps = CardCommonProps & {
  interactive?: false;
} & Omit<HTMLAttributes<HTMLDivElement>, keyof CardCommonProps>;

/**
 * Interactive + href — the whole card is one <Link>/<a>. Don't nest another
 * link or button inside; that creates two focusable targets with unclear
 * accessible names for one piece of content. If the card shows a title plus
 * other text, name it with `aria-labelledby` pointing at its own visible
 * title (see ProjectCard) rather than an `aria-label` that restates it —
 * an `aria-label` that doesn't contain the visible text fails WCAG 2.5.3.
 */
type CardLinkProps = CardCommonProps & {
  interactive: true;
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CardCommonProps | "href">;

/**
 * Interactive, no href — the whole card is one <button>. Same nested-interactive-element caveat as the link case.
 */
type CardButtonProps = CardCommonProps & {
  interactive: true;
  href?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CardCommonProps | "href" | "type">;

export type CardProps = CardStaticProps | CardLinkProps | CardButtonProps;

/**
 * The base surface for project cards, experience entries, certifications,
 * and achievements. Never fetches data or contains portfolio copy — callers
 * pass content as children. See /styleguide for every hover/interactive
 * combination.
 *
 * **This is a Server Component** (Phase 24). It was previously `"use client"`
 * only to run Framer Motion's `whileHover`/`whileFocus`; since a card's hover
 * treatment is a pure CSS state with no lifecycle, nothing was gained by
 * paying for hydration on every card on the page. The `MotionConflictingProps`
 * omission the old prop types needed (Framer Motion gives `onAnimationStart`
 * and friends a different signature than the DOM does) is gone with it, so
 * callers now get the plain HTML attribute types.
 */
export function Card({ padding = "md", hover = "none", className, children, ...props }: CardProps) {
  const classes = cn(baseClassName, paddingClassName[padding], hoverClassName[hover], className);

  if (props.interactive && typeof props.href === "string") {
    const { interactive: _interactive, href, ...anchorProps } = props;
    return (
      <Link href={href} className={cn(classes, interactiveClassName, "cursor-pointer")} {...anchorProps}>
        {children}
      </Link>
    );
  }

  if (props.interactive) {
    const { interactive: _interactive, href: _href, ...buttonProps } = props;
    return (
      <button type="button" className={cn(classes, interactiveClassName, "cursor-pointer")} {...buttonProps}>
        {children}
      </button>
    );
  }

  const { interactive: _interactive, ...divProps } = props;
  return (
    <div className={classes} {...divProps}>
      {children}
    </div>
  );
}
