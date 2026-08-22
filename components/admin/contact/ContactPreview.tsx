"use client";

import { SectionHeading } from "@/components/ui";
import { ContactContent } from "@/components/sections/ContactContent";
import type { AdminContactLink } from "@/lib/data/contactLinks";

export interface ContactPreviewProps {
  items: AdminContactLink[];
  hasResume: boolean;
}

/**
 * Renders the exact public `ContactContent` component (not a mock/screenshot
 * approximation) against whatever's currently published, so this preview is
 * always honest about what a visitor actually sees — including going empty
 * the moment every channel is unpublished, the same "hide entirely on zero
 * rows" behavior components/sections/Contact.tsx itself uses server-side.
 * Lives on the list page (not the individual edit form) since "how the
 * section renders" is a property of the whole published set, not one row in
 * isolation — it updates the moment a publish toggle or reorder lands,
 * exactly like the real site does after its own cache revalidates.
 */
export function ContactPreview({ items, hasResume }: ContactPreviewProps) {
  const published = items
    .filter((item) => item.published)
    .sort((a, b) => a.display_order - b.display_order)
    .map(({ published: _published, ...link }) => link);

  return (
    <div className="rounded-xl border border-border bg-background p-6 sm:p-10">
      <p className="mb-6 text-caption font-medium tracking-wide text-foreground-muted uppercase">
        Live preview — Contact section
      </p>
      <SectionHeading
        eyebrow="Get In Touch"
        heading="Let's Build Something"
        description="Have a project in mind, an opportunity to discuss, or just want to say hi? I'd love to hear from you."
      />
      <div className="mt-8">
        {published.length === 0 && !hasResume ? (
          <p className="text-body text-foreground-muted">
            Nothing published yet — this section is hidden on the public site.
          </p>
        ) : (
          <ContactContent contactLinks={published} hasResume={hasResume} />
        )}
      </div>
    </div>
  );
}
