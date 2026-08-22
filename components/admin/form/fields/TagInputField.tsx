"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { XIcon } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";

export interface TagInputFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: Path<TValues>;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Existing values to suggest via the native `<datalist>` autocomplete —
   * e.g. technology names already used on other projects, so "Postgres"
   * and "PostgreSQL" don't both end up as separate tags. Purely a browser
   * autocomplete hint, not a closed list — any typed value still commits.
   */
  suggestions?: string[];
}

/**
 * Holds the "currently being typed" draft text — a real hook, so it must
 * live in its own component invoked via JSX, never called directly inside
 * `FormField`'s `render` callback (that function runs inline during
 * `Controller`'s own render, not as a JSX element with its own Fiber, so
 * hooks there are unsound regardless of whether a given React version
 * happens to tolerate it — the exact mistake an earlier attempt at this
 * component made; see docs/progress.md's Phase 18 entry).
 */
function TagInputControl({
  value,
  onChange,
  disabled,
  placeholder,
  suggestions,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const datalistId = useId();

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      {value.map((tag, index) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
          {tag}
          {!disabled ? (
            <button type="button" onClick={() => removeAt(index)} aria-label={`Remove ${tag}`} className="text-muted-foreground hover:text-foreground">
              <XIcon className="size-3" />
            </button>
          ) : null}
        </span>
      ))}
      <input
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : undefined}
        disabled={disabled}
        list={suggestions?.length ? datalistId : undefined}
      />
      {suggestions?.length ? (
        <datalist id={datalistId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

/** Array-of-strings input — technologies, responsibilities, and similar tag/list fields. Enter or comma commits the current draft as a tag; Backspace on an empty draft removes the last tag. */
export function TagInputField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  suggestions,
}: TagInputFieldProps<TValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <TagInputControl
              value={(field.value as string[] | null | undefined) ?? []}
              onChange={field.onChange}
              disabled={disabled}
              placeholder={placeholder}
              suggestions={suggestions}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
