"use client";

import type { ReactNode } from "react";
import { useFieldArray, type ArrayPath, type Control, type FieldValues } from "react-hook-form";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { FormLabel } from "@/components/admin/ui/form";

export interface RepeatableGroupFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  /** The array field's path, e.g. "features" for project_features rows. */
  name: ArrayPath<TValues>;
  label: string;
  addLabel?: string;
  /** Default value for a newly appended row — shape must match the array field's element type. */
  emptyRow: TValues[keyof TValues] extends (infer Row)[] ? Row : unknown;
  /** Renders one row's own field components, scoped to `${name}.${index}.*` paths against the same `control`. */
  renderRow: (index: number) => ReactNode;
  disabled?: boolean;
}

/**
 * Repeatable sub-form rows — project features today, anything shaped as
 * "an array of small objects" tomorrow. `useFieldArray` is called here,
 * at this component's own top level (a real JSX element the caller
 * renders directly, not inside any `FormField` `render` callback), so
 * there's no risk of the hooks-in-a-render-prop mistake `TagInputField`/
 * `SlugField`'s controls specifically avoid.
 */
export function RepeatableGroupField<TValues extends FieldValues>({
  control,
  name,
  label,
  addLabel = "Add item",
  emptyRow,
  renderRow,
  disabled,
}: RepeatableGroupFieldProps<TValues>) {
  const { fields, append, remove, move } = useFieldArray({ control, name });

  return (
    <div className="flex flex-col gap-4">
      <FormLabel>{label}</FormLabel>

      {fields.length === 0 ? <p className="text-small text-foreground-muted">No items yet.</p> : null}

      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-small font-medium text-foreground-muted">Item {index + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label="Move up"
                >
                  <ArrowUpIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled || index === fields.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label="Move down"
                >
                  <ArrowDownIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  onClick={() => remove(index)}
                  aria-label="Remove item"
                >
                  <TrashIcon className="size-3.5" />
                </Button>
              </div>
            </div>
            {renderRow(index)}
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => append(emptyRow as never)} className="self-start">
        <PlusIcon className="size-4" /> {addLabel}
      </Button>
    </div>
  );
}
