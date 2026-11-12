"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { error?: string; ok?: string } | undefined;
type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  className = "",
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {state?.error && (
        <p role="alert" className="mb-4 rounded-lg border border-alert/30 bg-alert-light px-4 py-3 text-sm text-alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mb-4 rounded-lg border border-sage/30 bg-sage-light px-4 py-3 text-sm text-sage-dark">
          {state.ok}
        </p>
      )}
      {children}
    </form>
  );
}

export function Submit({
  children,
  variant = "primary",
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`btn-${variant} ${className}`}>
      {pending ? "Working…" : children}
    </button>
  );
}
