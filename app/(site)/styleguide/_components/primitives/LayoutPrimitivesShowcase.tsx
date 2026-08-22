import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PreviewTile } from "./PreviewTile";

export function LayoutPrimitivesShowcase() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewTile label="Section + Container + SectionHeading, composed together (scroll this box)">
        <div className="h-80 w-full overflow-y-auto rounded-lg border border-border">
          <Section id="styleguide-demo-section">
            <SectionHeading
              eyebrow="Example eyebrow"
              heading="Section heading example"
              description="This whole block is Section wrapping Container wrapping SectionHeading — the vertical rhythm, max width, and reveal-on-scroll are Section's, not hand-rolled here."
              action={<Button size="sm">Action</Button>}
            />
            <p className="text-body text-foreground-secondary">
              Section content goes here. Scroll this preview box up and down to see the reveal-on-scroll
              trigger (fires once).
            </p>
          </Section>
        </div>
      </PreviewTile>

      <PreviewTile label="SectionHeading — levels 2 / 3 / 4">
        <div className="flex w-full flex-col gap-6">
          <SectionHeading level={2} heading="Level 2 (h2, the default)" />
          <SectionHeading level={3} heading="Level 3 (h3)" />
          <SectionHeading level={4} heading="Level 4 (h4)" />
        </div>
      </PreviewTile>

      <PreviewTile label="Container — max-width wrapper on its own">
        <div className="w-full rounded-lg border border-dashed border-border-strong bg-surface">
          <Container className="py-6">
            <p className="text-small text-foreground-muted">
              This text sits inside a bare Container — max-w-7xl, responsive horizontal padding.
            </p>
          </Container>
        </div>
      </PreviewTile>
    </div>
  );
}
