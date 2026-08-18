"use client";

import { useEffect, useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
}: {
  value: string;
  onChange: (value: string) => void;
  sourceValue: string;
  disabled?: boolean;
  checkAvailability?: (slug: string) => Promise<boolean>;
}) {
  const [isManual, setIsManual] = useState(false);
  const [prevSourceValue, setPrevSourceValue] = useState(sourceValue);
  const [checkState, setCheckState] = useState<CheckState>(() =>
    checkAvailability && value ? "checking" : "idle",
  );
  const [prevCheckedValue, setPrevCheckedValue] = useState(value);

  // Auto-derive from the source field as it changes, unless the admin has
  // taken manual control — adjusted during render (comparing against a
  // mirrored previous value), not in an effect, per React's guidance
  // against synchronous setState-in-effect (same pattern LoginForm and
  // Navbar already use elsewhere in this codebase).
  if (sourceValue !== prevSourceValue) {
    setPrevSourceValue(sourceValue);
    if (!isManual) onChange(slugify(sourceValue));
  }

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
          value={value}
          onChange={(event) => {
            setIsManual(true);
            onChange(slugify(event.target.value));
          }}
          disabled={disabled}
        />
        {checkState === "checking" ? <Loader2Icon className="size-4 shrink-0 animate-spin text-foreground-muted" aria-label="Checking availability" /> : null}
        {checkState === "available" ? <CheckIcon className="size-4 shrink-0 text-success" aria-label="Slug available" /> : null}
        {checkState === "taken" ? <XIcon className="size-4 shrink-0 text-danger" aria-label="Slug already in use" /> : null}
      </div>
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
