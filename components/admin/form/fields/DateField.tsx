"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";
import { Input } from "@/components/admin/ui/input";

export interface DateFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: Path<TValues>;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** A cleared native date input reports "" — passed straight through so an `optionalDateSchema` field transforms it to `null`; a `dateSchema` (required) field correctly fails validation instead. */
export function DateField<TValues extends FieldValues>({ control, name, label, description, disabled }: DateFieldProps<TValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={(field.value as string | null | undefined) ?? ""}
              onChange={(event) => field.onChange(event.target.value)}
              type="date"
              disabled={disabled}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
