"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { cn } from "@/lib/utils";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";
import { Textarea } from "@/components/admin/ui/textarea";

export interface TextareaFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: Path<TValues>;
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  /**
   * The brief's "rich text or markdown for long bodies" field type: this
   * project has no WYSIWYG/markdown editor dependency (CLAUDE.md's fixed
   * stack doesn't include one, and no public-facing markdown *renderer*
   * has been built yet either — every long-body field today renders as
   * plain paragraphs, e.g. lib/utils.ts's `splitParagraphs`). A plain
   * textarea already *is* a markdown source editor; this flag only swaps
   * in a monospace font and a "Markdown supported" hint rather than
   * duplicating TextareaField as a second component for no structural
   * difference.
   */
  markdown?: boolean;
}

export function TextareaField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  rows = 4,
  disabled,
  markdown,
}: TextareaFieldProps<TValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={(field.value as string | null | undefined) ?? ""}
              rows={rows}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(markdown && "font-mono text-sm")}
            />
          </FormControl>
          {markdown || description ? (
            <FormDescription>{markdown ? "Markdown supported." : description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
