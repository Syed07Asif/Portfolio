"use client";

import { useEffect, useRef, useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { slugify } from "@/lib/utils";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";
import { Input } from "@/components/admin/ui/input";

export interface SlugFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: Path<TValues>;
  /** The field the slug auto-generates from (e.g. "name") while the admin hasn't manually edited the slug yet. */
  sourceName: Path<TValues>;
  label?: string;
  /** Live duplicate check, scoped to the entity by the caller (e.g. "is any *other* project already using this slug") — this field has no table/entity knowledge of its own. */
  checkAvailability?: (slug: string) => Promise<boolean>;
  disabled?: boolean;
}

type CheckState = "idle" | "checking" | "available" | "taken";

/**
 * Owns real hook state (manual-override flag, the debounced availability
 * check) — invoked via JSX inside `FormField`'s `render` callback, never
 * called as a plain function there, for the same reason `TagInputField`'s
 * control is split out (see that file's comment).
 */
function SlugControl({
  value,
  onChange,
  sourceValue,
  disabled,
  checkAvailability,
  ...controlProps
}: {
  value: string;
  onChange: (value: string) => void;
  sourceValue: string;
  disabled?: boolean;
  checkAvailability?: (slug: string) => Promise<boolean>;
  /**
   * `id`, `aria-describedby` and `aria-invalid`, injected by the surrounding
   * `FormControl` (a Radix `Slot`). Because this is a *component* rather than
   * a DOM element, Slot hands them over as plain React props and they are
   * dropped unless something forwards them — which is exactly what used to
   * happen: the `<Input>` below ended up with no `id`, so the `<FormLabel>`'s
   * `for` pointed at nothing and axe failed it under `label` (critical) on
   * /admin/projects/new. Spreading them onto the real input is the fix.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [isManual, setIsManual] = useState(false);
  const [checkState, setCheckState] = useState<CheckState>(() =>
    checkAvailability && value ? "checking" : "idle",
  );
  const [prevCheckedValue, setPrevCheckedValue] = useState(value);
  // Lazily initialized once, from whatever `sourceValue` already is at
  // mount — not a plain boolean "have we run yet" flag. A boolean flag
  // breaks under React Strict Mode's dev-only double-invoke-on-mount
  // behavior: the ref flips to "already ran" on the first of the two
  // simulated mount passes, so the second pass no longer skips and fires
  // a spurious `onChange` derived from a `sourceValue` that never
  // actually changed — caught live editing a draft project with a blank
  // name (Phase 20): it silently wiped an already-saved slug back to ""
  // on page load, before the admin touched anything. Comparing against
  // the *actual last-seen value* is correct regardless of how many times
  // the effect happens to run for the same underlying value.
  const prevSourceValueRef = useRef(sourceValue);

  // Auto-derive from the source field as it changes, unless the admin has
  // taken manual control. This has to run in an effect, not adjusted
  // directly during render the way `checkState` below is — React's "adjust
  // state during render" pattern only covers a component's *own* local
  // state; `onChange` here is the *parent* Controller's setter (passed
  // down as a prop), and calling it mid-render produces a real "Cannot
  // update a component while rendering a different component" warning —
  // caught live the first time this field's `checkAvailability` prop was
  // actually wired up for real (ProjectForm, Phase 20), which was also the
  // first time anything exercised this exact code path thoroughly enough
  // to surface it.
  useEffect(() => {
    const changed = sourceValue !== prevSourceValueRef.current;
    prevSourceValueRef.current = sourceValue;
    if (changed && !isManual) onChange(slugify(sourceValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-derive when sourceValue itself changes; isManual/onChange are read fresh via closure, not tracked as re-trigger conditions
  }, [sourceValue]);

  // Same fix, applied to the "start checking" transition: flip to
  // "checking" (or back to "idle" if there's nothing to check) the instant
  // `value` changes, computed here rather than as a synchronous setState
  // inside the effect below — which is left to do only the genuinely async
  // part (the debounced call itself and its eventual result).
  if (value !== prevCheckedValue) {
    setPrevCheckedValue(value);
    setCheckState(checkAvailability && value ? "checking" : "idle");
  }

  useEffect(() => {
    if (!checkAvailability || !value) return;
    const timeoutId = setTimeout(async () => {
      const available = await checkAvailability(value);
      setCheckState(available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [value, checkAvailability]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          {...controlProps}
          value={value}
          onChange={(event) => {
            setIsManual(true);
            onChange(slugify(event.target.value));
          }}
          disabled={disabled}
        />
        {/*
          Decorative here: the icons duplicate the status that the live region
          below announces in words. They previously carried `aria-label`,
          which on a bare <svg> is unreliable — and, more importantly, an icon
          swapping in place produces no announcement at all, so a screen-reader
          user got no feedback that a slug was already taken. Colour is never
          the only signal either: each state has both an icon shape and text.
        */}
        {checkState === "checking" ? <Loader2Icon aria-hidden="true" className="size-4 shrink-0 animate-spin text-foreground-muted" /> : null}
        {checkState === "available" ? <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" /> : null}
        {checkState === "taken" ? <XIcon aria-hidden="true" className="size-4 shrink-0 text-danger" /> : null}
      </div>
      <span aria-live="polite" className="sr-only">
        {checkState === "checking" ? "Checking slug availability" : null}
        {checkState === "available" ? "Slug is available" : null}
        {checkState === "taken" ? "Slug is already in use" : null}
      </span>
      {checkState === "taken" ? <p className="text-caption text-danger">This slug is already in use.</p> : null}
      {isManual ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsManual(false);
            onChange(slugify(sourceValue));
          }}
          className="self-start text-caption text-accent hover:underline"
        >
          Reset to auto-generated
        </button>
      ) : null}
    </div>
  );
}

export function SlugField<TValues extends FieldValues>({
  control,
  name,
  sourceName,
  label = "Slug",
  checkAvailability,
  disabled,
}: SlugFieldProps<TValues>) {
  const sourceValue = (useWatch({ control, name: sourceName }) as string | undefined) ?? "";

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <SlugControl
              value={(field.value as string | undefined) ?? ""}
              onChange={field.onChange}
              sourceValue={sourceValue}
              disabled={disabled}
              checkAvailability={checkAvailability}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
