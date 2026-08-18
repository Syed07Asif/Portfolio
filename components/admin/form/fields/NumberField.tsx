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
              value={typeof field.value === "number" ? field.value : 0}
              onChange={(event) => {
                const parsed = event.target.valueAsNumber;
                field.onChange(Number.isNaN(parsed) ? 0 : parsed);
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
