import { BadgeTagShowcase } from "./primitives/BadgeTagShowcase";
import { ButtonShowcase } from "./primitives/ButtonShowcase";
import { CardShowcase } from "./primitives/CardShowcase";
import { LayoutPrimitivesShowcase } from "./primitives/LayoutPrimitivesShowcase";
import { MiscShowcase } from "./primitives/MiscShowcase";
import { ShadcnPreview } from "./primitives/ShadcnPreview";

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-h4 font-display font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function PrimitivesShowcase() {
  return (
    <div className="flex flex-col gap-14">
      <Subsection title="Button & IconButton">
        <ButtonShowcase />
      </Subsection>
      <Subsection title="Card">
        <CardShowcase />
      </Subsection>
      <Subsection title="Section, Container & SectionHeading">
        <LayoutPrimitivesShowcase />
      </Subsection>
      <Subsection title="Badge & Tag">
        <BadgeTagShowcase />
      </Subsection>
      <Subsection title="Divider, Avatar, EmptyState & Skeleton">
        <MiscShowcase />
      </Subsection>
      <Subsection title="shadcn/ui (admin-only, themed)">
        <ShadcnPreview />
      </Subsection>
    </div>
  );
}
