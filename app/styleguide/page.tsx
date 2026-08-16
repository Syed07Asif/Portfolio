import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ColorSwatches } from "./_components/ColorSwatches";
import { MotionDemos } from "./_components/MotionDemos";
import { PrimitivesShowcase } from "./_components/PrimitivesShowcase";
import { RadiusScale } from "./_components/RadiusScale";
import { ShadowScale } from "./_components/ShadowScale";
import { SpacingScale } from "./_components/SpacingScale";
import { StyleguideSection } from "./_components/StyleguideSection";
import { TypeScale } from "./_components/TypeScale";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

export default function StyleguidePage() {
  // Visible in local dev and Vercel preview deployments (useful while
  // building later phases); 404s on the real production deployment.
  // VERCEL_ENV is unset outside Vercel, so this defaults to visible.
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-16">
      <div className="flex flex-col gap-2">
        <p className="text-caption uppercase tracking-wider text-accent">Internal tool</p>
        <h1 className="text-display font-display font-extrabold text-foreground">Styleguide</h1>
        <p className="text-body-lg text-foreground-secondary max-w-2xl">
          Every design token, motion variant, and UI primitive, rendered live. Visual QA for the rest
          of the build — not part of the public site.
        </p>
      </div>

      <StyleguideSection title="Colors" description="Every colour token, rendered via its Tailwind utility class.">
        <ColorSwatches />
      </StyleguideSection>

      <StyleguideSection title="Typography" description="The full type scale — display through caption.">
        <TypeScale />
      </StyleguideSection>

      <StyleguideSection
        title="Spacing"
        description="The numeric scale every p-*/gap-*/w-* utility derives from, plus the named section-rhythm tokens."
      >
        <SpacingScale />
      </StyleguideSection>

      <StyleguideSection
        title="Radius & border width"
        description="Corner radius scale and the three border-width tokens."
      >
        <RadiusScale />
      </StyleguideSection>

      <StyleguideSection
        title="Shadow & glow"
        description="Elevation shadows plus the accent/cyan/warm glow tokens."
      >
        <ShadowScale />
      </StyleguideSection>

      <StyleguideSection
        title="Motion"
        description="Every variant exported from lib/motion.ts. Reduced-motion handling is automatic (MotionProvider) — try enabling 'Reduce motion' in your OS accessibility settings and replaying these."
      >
        <MotionDemos />
      </StyleguideSection>

      <StyleguideSection
        id="primitives"
        title="Primitives"
        description="Every component from components/ui, every variant, every state — plus a themed shadcn/ui check. No section in Phase 7+ should define its own button/card/badge styling."
      >
        <PrimitivesShowcase />
      </StyleguideSection>
    </main>
  );
}
