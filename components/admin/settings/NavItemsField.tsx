"use client";

import { useState } from "react";
import { useController, type Control } from "react-hook-form";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { RepeatableGroupField, TextField } from "@/components/admin/form/fields";
import { Button } from "@/components/admin/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";
import type { SiteSettingsInput } from "@/lib/validation";

export interface NavItemsFieldProps {
  control: Control<SiteSettingsInput>;
  /** Keyed by href (e.g. "#projects") — true when that section currently has published content behind it, so hiding its nav link is worth a second thought. Computed server-side from the same public getX() reads the site itself uses (see the Settings page). */
  sectionHasContent: Record<string, boolean>;
  disabled?: boolean;
}

/**
 * One nav item's visibility toggle — deliberately not `SwitchField` (every
 * other boolean field in this codebase): hiding an item whose href still has
 * published content behind it needs a confirmation step first, which a
 * plain field component has no hook for. Uses `useController` directly,
 * called from real JSX (`<HideToggle .../>` inside the row it renders,
 * itself a value `RepeatableGroupField.renderRow` returns into a real
 * position in that component's JSX tree) — not inside any `FormField`
 * `render` callback, so this is a proper component instance with its own
 * Fiber and hooks are sound here, same reasoning TagInputField's own doc
 * comment already establishes for this codebase.
 */
function HideToggle({
  control,
  index,
  hasContent,
}: {
  control: Control<SiteSettingsInput>;
  index: number;
  hasContent: boolean;
}) {
  const hiddenField = useController({ control, name: `primary_nav.${index}.hidden` });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isHidden = Boolean(hiddenField.field.value);

  function handleClick() {
    if (isHidden) {
      hiddenField.field.onChange(false);
      return;
    }
    if (hasContent) {
      setConfirmOpen(true);
      return;
    }
    hiddenField.field.onChange(true);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleClick}>
        {isHidden ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        {isHidden ? "Hidden" : "Visible"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide this nav item?</AlertDialogTitle>
            <AlertDialogDescription>
              This section still has published content behind it. Hiding only removes its link from the navigation
              menu — the section itself stays on the page and is still reachable by scrolling or a direct link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                hiddenField.field.onChange(true);
                setConfirmOpen(false);
              }}
            >
              Hide it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Add/rename/reorder/hide primary nav items — the only way future sections get into the nav without touching code, per CLAUDE.md's core principle. */
export function NavItemsField({ control, sectionHasContent, disabled }: NavItemsFieldProps) {
  return (
    <RepeatableGroupField
      control={control}
      name="primary_nav"
      label="Primary navigation"
      addLabel="Add nav item"
      emptyRow={{ label: "", href: "", hidden: false }}
      disabled={disabled}
      renderRow={(index) => (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField control={control} name={`primary_nav.${index}.label`} label="Label" />
            <TextField
              control={control}
              name={`primary_nav.${index}.href`}
              label="Href"
              description="e.g. #projects for a same-page section, or /blog for a route."
            />
          </div>
          <HideToggleRow control={control} index={index} sectionHasContent={sectionHasContent} />
        </div>
      )}
    />
  );
}

function HideToggleRow({
  control,
  index,
  sectionHasContent,
}: {
  control: Control<SiteSettingsInput>;
  index: number;
  sectionHasContent: Record<string, boolean>;
}) {
  const hrefField = useController({ control, name: `primary_nav.${index}.href` });
  const href = String(hrefField.field.value ?? "");

  return (
    <div className="flex justify-end">
      <HideToggle control={control} index={index} hasContent={Boolean(sectionHasContent[href])} />
    </div>
  );
}
