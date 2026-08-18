"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

export function ResetPasswordForm({
  action,
}: {
  action: (state: { error?: string } | undefined, formData: FormData) => Promise<{ error?: string } | undefined>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <label className="field-label">
        Nowe hasło
        <span className="input-shell">
          <LockKeyhole size={18} />
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Minimum 8 znaków"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Ukryj hasło" : "Pokaż hasło"}
            className="shrink-0 text-slate-500 transition hover:text-lime-300"
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>
      <label className="field-label">
        Powtórz hasło
        <span className="input-shell">
          <LockKeyhole size={18} />
          <input
            name="confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="To samo hasło jeszcze raz"
            required
            minLength={8}
          />
        </span>
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300"
        >
          {state.error}
        </p>
      )}

      <SubmitButton
        pendingLabel="Zapisywanie…"
        className="button-primary w-full justify-center py-3.5"
      >
        Zapisz nowe hasło
      </SubmitButton>

      <p className="text-center text-sm text-slate-400">
        <Link href="/login" className="font-bold text-white hover:text-lime-400">
          ← Wróć do logowania
        </Link>
      </p>
    </form>
  );
}
