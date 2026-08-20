"use client";

import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * Split out of ContactContent in Phase 24 so that component could become a
 * Server Component. This is the *only* genuinely interactive thing in the
 * Contact section — it owns clipboard state and is the single reason `sonner`
 * is reachable from the public bundle at all — so isolating it here keeps the
 * contact grid (four static link cards) out of hydration entirely.
 *
 * The result is announced two ways, because the visible change is a label and
 * icon swap that a screen-reader user tabbing past would otherwise miss: the
 * toast for sighted users, and a visually hidden `aria-live="polite"` region
 * for assistive tech. State is never conveyed by colour alone — the label
 * itself changes from "Copy email address" to "Copied".
 */
export function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setStatus("Email address copied to clipboard");
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus("Couldn't copy the email address automatically. Please select and copy it manually.");
      toast.error("Couldn't copy automatically — please select and copy the address manually.");
    }
  }

  return (
    <>
      <Button variant="secondary" size="lg" leadingIcon={copied ? Check : Copy} onClick={handleCopy}>
        {copied ? "Copied" : "Copy email address"}
      </Button>
      <span aria-live="polite" className="sr-only">
        {status}
      </span>
    </>
  );
}
