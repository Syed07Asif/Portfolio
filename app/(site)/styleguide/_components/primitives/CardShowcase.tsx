"use client";

import { Card } from "@/components/ui/Card";
import { PreviewTile } from "./PreviewTile";

export function CardShowcase() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewTile label="Padding — none / sm / md / lg">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card padding="none">
            <p className="text-small text-foreground-muted">none</p>
          </Card>
          <Card padding="sm">
            <p className="text-small text-foreground-muted">sm</p>
          </Card>
          <Card padding="md">
            <p className="text-small text-foreground-muted">md</p>
          </Card>
          <Card padding="lg">
            <p className="text-small text-foreground-muted">lg</p>
          </Card>
        </div>
      </PreviewTile>

      <PreviewTile label="Hover — none / lift / glow (static card, hover to try)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card hover="none">
            <p className="text-body font-medium text-foreground">hover=&quot;none&quot;</p>
            <p className="text-small text-foreground-muted">No hover effect.</p>
          </Card>
          <Card hover="lift">
            <p className="text-body font-medium text-foreground">hover=&quot;lift&quot;</p>
            <p className="text-small text-foreground-muted">Lifts on hover.</p>
          </Card>
          <Card hover="glow">
            <p className="text-body font-medium text-foreground">hover=&quot;glow&quot;</p>
            <p className="text-small text-foreground-muted">Glows on hover.</p>
          </Card>
        </div>
      </PreviewTile>

      <PreviewTile label="Interactive — real <a> and real <button>, keyboard-focusable, one accessible name">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card interactive href="#primitives" hover="lift">
            <p className="text-body font-medium text-foreground">Interactive link card</p>
            <p className="text-small text-foreground-muted">
              The whole card is a single &lt;a&gt; — tab to it, its accessible name is this text.
            </p>
          </Card>
          <Card interactive hover="glow" onClick={() => {}} aria-label="Interactive button card example">
            <p className="text-body font-medium text-foreground">Interactive button card</p>
            <p className="text-small text-foreground-muted">
              No href, so this renders as a real &lt;button&gt; instead.
            </p>
          </Card>
        </div>
      </PreviewTile>
    </div>
  );
}
