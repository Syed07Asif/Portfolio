"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Form } from "@/components/admin/ui/form";

export interface AdminFormShellProps<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  onValid: (values: TValues) => void;
  isPending: boolean;
  submitLabel: string;
  cancelHref: string;
  children: ReactNode;
}

/**
 * The one place every entity form's `<form>` tag, submit wiring, error
 * summary, and Cancel/Submit footer live — an entity's own `<Entity>Form>`
 * only ever supplies `{children}` (its field components). Plain
 * `onSubmit={form.handleSubmit(onValid)}` on a real `<form>` element, no
 * portal, no indirection between this tag and the fields it wraps — kept
 * deliberately simple after Phase 18's first attempt hit an unresolved bug
 * where submission never reached this handler at all (see
 * docs/progress.md's Phase 18 entry); this version was verified against a
 * real browser click, not just written.
 */
export function AdminFormShell<TValues extends FieldValues>({
  form,
  onValid,
  isPending,
  submitLabel,
  cancelHref,
  children,
}: AdminFormShellProps<TValues>) {
  const errorCount = Object.keys(form.formState.errors).length;
  const showSummary = form.formState.isSubmitted && errorCount > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onValid)} noValidate className="flex flex-col gap-6">
        {showSummary ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              {errorCount === 1 ? "There is 1 error" : `There are ${errorCount} errors`} in this form — check the
              highlighted fields below.
            </AlertDescription>
          </Alert>
        ) : null}

        {children}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <Button type="button" variant="outline" disabled={isPending} asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
            {isPending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
