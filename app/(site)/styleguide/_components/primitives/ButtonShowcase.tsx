import { ArrowRight, Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PreviewTile } from "./PreviewTile";

const VARIANTS = ["primary", "secondary", "ghost", "outline", "link"] as const;
const SIZES = ["sm", "md", "lg"] as const;

export function ButtonShowcase() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewTile label="Variants (size md, default state)">
        <div className="flex flex-wrap items-center gap-4">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </PreviewTile>

      <PreviewTile label="Sizes (variant primary)">
        <div className="flex flex-wrap items-center gap-4">
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              Button {size}
            </Button>
          ))}
        </div>
      </PreviewTile>

      <PreviewTile label="Icons">
        <div className="flex flex-wrap items-center gap-4">
          <Button leadingIcon={Plus}>Add project</Button>
          <Button variant="outline" trailingIcon={ArrowRight}>
            View projects
          </Button>
          <Button variant="secondary" leadingIcon={Download} trailingIcon={ArrowRight}>
            Download résumé
          </Button>
        </div>
      </PreviewTile>

      <PreviewTile label="States — default / hover / focus / active / disabled / loading">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Default</Button>
          {/* hover/focus/active below are forced (not real pseudo-classes) so every state is visible without interacting — labelled accordingly. */}
          <Button className="bg-accent-hover">Hover (forced)</Button>
          <Button className="ring-2 ring-ring ring-offset-2 ring-offset-background">Focus (forced)</Button>
          <Button className="brightness-95">Active (forced)</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
      </PreviewTile>

      <PreviewTile label="asChild (renders as next/link's Link, not a <button>)">
        <Button asChild variant="outline" trailingIcon={ArrowRight}>
          <a href="#primitives">This is an &lt;a&gt;, styled as a Button</a>
        </Button>
      </PreviewTile>

      <PreviewTile label="IconButton — variants (size md)">
        <div className="flex flex-wrap items-center gap-4">
          <IconButton icon={ArrowRight} variant="primary" aria-label="Primary example" />
          <IconButton icon={ArrowRight} variant="secondary" aria-label="Secondary example" />
          <IconButton icon={ArrowRight} variant="ghost" aria-label="Ghost example" />
          <IconButton icon={ArrowRight} variant="outline" aria-label="Outline example" />
        </div>
      </PreviewTile>

      <PreviewTile label="IconButton — sizes / states">
        <div className="flex flex-wrap items-center gap-4">
          <IconButton icon={ArrowRight} size="sm" aria-label="Small" />
          <IconButton icon={ArrowRight} size="md" aria-label="Medium" />
          <IconButton icon={ArrowRight} size="lg" aria-label="Large" />
          <IconButton icon={Trash2} variant="outline" disabled aria-label="Disabled" />
          <IconButton icon={Trash2} variant="outline" loading aria-label="Loading" />
        </div>
      </PreviewTile>
    </div>
  );
}
