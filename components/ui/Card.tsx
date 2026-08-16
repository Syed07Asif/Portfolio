"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { hoverGlow, hoverLift } from "@/lib/motion";

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

function hoverEffectFor(hover: CardHoverEffect) {
  if (hover === "lift") return hoverLift;
  if (hover === "glow") return hoverGlow;
  return undefined;
}

type CardCommonProps = {
  padding?: CardPadding;
  hover?: CardHoverEffect;
  className?: string;
  children?: ReactNode;
};

/** Framer Motion gives these props a different (non-DOM-event) signature than the native HTML attributes do — can't spread both onto the same element. */
type MotionConflictingProps =
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd";

/**
 * Not interactive — a static grouping surface. Renders a <div>.
 */
type CardStaticProps = CardCommonProps & {
  interactive?: false;
} & Omit<HTMLAttributes<HTMLDivElement>, keyof CardCommonProps | MotionConflictingProps>;

/**
 * Interactive + href — the whole card is one <Link>/<a>. Don't nest another
 * link or button inside; that creates two focusable targets with unclear
 * accessible names for one piece of content. If the card shows a title plus
 * other text, either let the title be the only visible link-like text or
 * pass an explicit `aria-label` summarising the card.
 */
type CardLinkProps = CardCommonProps & {
  interactive: true;
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CardCommonProps | "href" | MotionConflictingProps>;

/**
 * Interactive, no href — the whole card is one <button>. Same nested-interactive-element caveat as the link case.
 */
type CardButtonProps = CardCommonProps & {
  interactive: true;
  href?: undefined;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof CardCommonProps | "href" | "type" | MotionConflictingProps
>;

export type CardProps = CardStaticProps | CardLinkProps | CardButtonProps;

const MotionLink = motion.create(Link);

/**
 * The base surface for project cards, experience entries, certifications,
 * and achievements. Never fetches data or contains portfolio copy — callers
 * pass content as children. See /styleguide for every hover/interactive
 * combination.
 */
export const Card = forwardRef<HTMLDivElement | HTMLAnchorElement | HTMLButtonElement, CardProps>(
  ({ padding = "md", hover = "none", className, children, ...props }, ref) => {
    const classes = cn(baseClassName, paddingClassName[padding], className);
    const whileHover = hoverEffectFor(hover);

    if (props.interactive && typeof props.href === "string") {
      const { interactive: _interactive, href, ...anchorProps } = props;
      return (
        <MotionLink
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          whileHover={whileHover}
          className={cn(classes, interactiveClassName, "cursor-pointer")}
          {...anchorProps}
        >
          {children}
        </MotionLink>
      );
    }

    if (props.interactive) {
      const { interactive: _interactive, href: _href, ...buttonProps } = props;
      return (
        <motion.button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          whileHover={whileHover}
          className={cn(classes, interactiveClassName, "cursor-pointer")}
          {...buttonProps}
        >
          {children}
        </motion.button>
      );
    }

    const { interactive: _interactive, ...divProps } = props;
    return (
      <motion.div
        ref={ref as React.Ref<HTMLDivElement>}
        whileHover={whileHover}
        className={classes}
        {...divProps}
      >
        {children}
      </motion.div>
    );
  },
);

Card.displayName = "Card";
