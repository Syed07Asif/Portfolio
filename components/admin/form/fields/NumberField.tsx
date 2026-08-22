"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";
import { Input } from "@/components/admin/ui/input";

export interface NumberFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: Path<TValues>;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** When true, a cleared input commits `null` instead of coercing to `0` — for a genuinely optional numeric column (e.g. skill proficiency), where "empty" and "zero" are different values. Defaults to false, preserving every existing caller's always-a-number behavior (display_order, etc.). */
  allowEmpty?: boolean;
}

export function NumberField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  min,
  max,
  step,
  disabled,
  allowEmpty,
}: NumberFieldProps<TValues>) {
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
              value={field.value === null || field.value === undefined ? "" : (field.value as number)}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === "" && allowEmpty) {
                  field.onChange(null);
                  return;
                }
                const parsed = event.target.valueAsNumber;
                field.onChange(Number.isNaN(parsed) ? (allowEmpty ? null : 0) : parsed);
              }}
              type="number"
              min={min}
              max={max}
              step={step}
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
