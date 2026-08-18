"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { signIn, type SignInState } from "@/app/admin/login/actions";

const INITIAL_STATE: SignInState = { error: null };

/** After this many failed attempts in a row, force a short pause before the next one can even be submitted. */
const ATTEMPTS_BEFORE_COOLDOWN = 3;
const COOLDOWN_SECONDS = 10;

export interface LoginFormProps {
  /** Where to return after a successful sign-in — read from the URL by the server page, validated again server-side (resolveNextPath) before ever being used in a redirect. */
  next?: string;
}

/**
 * Client-side "debounce repeated attempts": disables the submit button
 * while a request is in flight, and after a few consecutive failures
 * imposes a short, visible cooldown before another attempt is even sent.
 * This is UX, not the actual security boundary — Supabase Auth enforces
 * its own server-side rate limiting on sign-in attempts regardless (the
 * action already surfaces that as a distinct "too many attempts" message
 * when it fires); this just avoids hammering the endpoint from an
 * impatient retry-click in the meantime.
 */
export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signIn, INITIAL_STATE);
  const [prevState, setPrevState] = useState(state);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Bump the failure count the moment a *new* error result arrives —
  // adjusted during render (comparing against a mirrored previous value),
  // not in an effect, per React's own guidance against calling setState
  // synchronously inside one (same pattern Navbar.tsx uses for "reset
  // state when a prop changes").
  if (state !== prevState) {
    setPrevState(state);
    if (state.error) {
      const updated = failedAttempts + 1;
      setFailedAttempts(updated);
      if (updated >= ATTEMPTS_BEFORE_COOLDOWN) setCooldown(COOLDOWN_SECONDS);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const isBlocked = isPending || cooldown > 0;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
      <div className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="font-display text-h4 font-semibold text-foreground">Admin Sign In</h1>
        <p className="text-small text-foreground-muted">Sign in to manage your portfolio content.</p>
      </div>

      {next ? (
        <Alert className="mb-6">
          <AlertDescription>Please sign in to continue.</AlertDescription>
        </Alert>
      ) : null}

      <form
        action={formAction}
        onSubmit={(event) => {
          if (cooldown > 0) event.preventDefault();
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="next" value={next ?? ""} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required disabled={isPending} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
        </div>

        {state.error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {cooldown > 0 ? (
          <p className="text-small text-foreground-muted" role="status">
            Too many attempts — try again in {cooldown}s.
          </p>
        ) : null}

        <Button type="submit" disabled={isBlocked} className="mt-2">
          {isPending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </div>
  );
}
