import type { JsonLdNode } from "@/lib/jsonLd";

export interface JsonLdProps {
  /** Usually a `jsonLdGraph(...)` document — one script tag carrying every node the page describes. */
  data: JsonLdNode;
}

/**
 * Renders a structured-data script tag. A Server Component with no styling
 * and no client JavaScript — the markup is in the initial HTML, which is
 * the only form a crawler reads.
 *
 * `dangerouslySetInnerHTML` is the only way to emit raw JSON inside a
 * script tag (React escapes text children, producing `&quot;` where a
 * parser needs `"`). The `<` replacement is the standard mitigation for the
 * one genuine injection vector that opens up: a database string containing
 * a closing script tag would otherwise terminate the block early. Escaping
 * every `<` as its unicode JSON escape is still valid JSON and parses back
 * to the identical string.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
