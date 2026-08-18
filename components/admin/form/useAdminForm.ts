"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import type { ActionResult } from "@/lib/actions/shared";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

export interface UseAdminFormOptions<TSchema extends z.ZodType<FieldValues>> {
  schema: TSchema;
  defaultValues: DefaultValues<z.infer<TSchema>>;
  /** The bound Server Action (e.g. `(values) => createEducation(values)`) — already validates server-side too; this is client-side validation only, so errors surface before a round trip. */
  onSubmit: (values: z.infer<TSchema>) => Promise<ActionResult<unknown>>;
  successMessage: string;
  /** Where to send the admin after a successful save. */
  redirectTo: string;
}

/**
 * The shared submit/validate/error/toast/unsaved-changes machinery every
 * entity form uses via `<AdminFormShell>`. Built on react-hook-form +
 * `zodResolver` against the entity's *existing* `lib/validation` schema —
 * this hook never defines new validation rules, only wires an existing
 * schema into RHF and a Server Action.
 */
export function useAdminForm<TSchema extends z.ZodType<FieldValues>>({
  schema,
  defaultValues,
  onSubmit,
  successMessage,
  redirectTo,
}: UseAdminFormOptions<TSchema>) {
  type Values = z.infer<TSchema>;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Suppresses the unsaved-changes guard the instant a save succeeds, so the
  // redirect that follows doesn't immediately trigger its own "leave without
  // saving?" prompt against the very save that just completed.
  const [hasSaved, setHasSaved] = useState(false);

  const form = useForm<Values>({
    // zodResolver's types bridge Zod 3 and Zod 4 signatures and can't be
    // satisfied by a fully generic `TSchema extends z.ZodType<FieldValues>`
    // wrapper without fighting variance errors indefinitely — this cast is
    // the one place that absorbs it; every *external* caller of
    // useAdminForm (every entity form) still gets a fully type-checked
    // `form`/`onValid` pair, since `Values` itself is derived from the
    // concrete schema each caller passes in.
    resolver: zodResolver(schema as never) as unknown as Resolver<Values>,
    defaultValues,
    mode: "onBlur",
  });

  useUnsavedChangesGuard(form.formState.isDirty && !hasSaved);

  function onValid(values: Values) {
    startTransition(async () => {
      const result = await onSubmit(values);

      if (!result.success) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            const path = (field === "_root" ? "root" : field) as Path<Values>;
            form.setError(path, { type: "server", message: messages[0] });
          }
        }
        return;
      }

      setHasSaved(true);
      toast.success(successMessage);
      router.push(redirectTo);
      router.refresh();
    });
  }

  return { form, isPending, onValid };
}
