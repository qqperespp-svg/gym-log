"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, KeyRound, Mail, Send } from "lucide-react";
import { requestPasswordResetAction } from "@/actions/password-reset";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, undefined);

  if (state?.success) {
    return (
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 inline-flex items-center gap-3 text-white">
          <span className="grid size-11 place-items-center rounded-2xl bg-lime-400 text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.24)]">
            <KeyRound size={23} />
          </span>
          <span className="text-xl font-black tracking-[-0.04em]">
            GYM<span className="text-lime-400">RAT</span>
          </span>
        </Link>
        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[.06] p-6">
          <p className="flex items-center gap-2 font-extrabold text-white">
            <span className="grid size-8 place-items-center rounded-lg bg-lime-400 text-slate-950">
              <Send size={15} />
            </span>
            Link do resetu gotowy
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {state.resetUrl
              ? "W środowisku demo usługa e-mail nie jest skonfigurowana, więc link do ustawienia nowego hasła wyświetlamy bezpośrednio poniżej (w produkcji zostałby wysłany na Twój adres e-mail)."
              : `Instrukcja została wysłana na adres ${state.email}. Sprawdź skrzynkę odbiorczą (i folder spam).`}
          </p>
          {state.resetUrl && (
            <Link href={state.resetUrl} className="button-primary mt-4 w-full justify-center">
              Ustaw nowe hasło
            </Link>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-slate-400">
          <Link href="/login" className="font-bold text-white hover:text-lime-400">
            ← Wróć do logowania
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-10 inline-flex items-center gap-3 text-white">
        <span className="grid size-11 place-items-center rounded-2xl bg-lime-400 text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.24)]">
          <KeyRound size={23} />
        </span>
        <span className="text-xl font-black tracking-[-0.04em]">
          GYM<span className="text-lime-400">RAT</span>
        </span>
      </Link>

      <div className="mb-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-lime-400">
          Odzyskiwanie dostępu
        </p>
        <h1 className="text-4xl font-black tracking-[-0.045em] text-white">
          Nie pamiętasz hasła?
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Podaj adres e-mail konta, a przygotujemy link do ustawienia nowego hasła.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <label className="field-label">
          Adres e-mail
          <span className="input-shell">
            <Mail size={18} />
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ty@email.pl"
              required
              defaultValue={state?.email}
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
          pendingLabel="Wysyłanie…"
          className="button-primary w-full justify-center py-3.5"
        >
          Wyślij link do resetu
        </SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-slate-400">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-bold text-white hover:text-lime-400"
        >
          <ArrowLeft size={15} /> Wróć do logowania
        </Link>
      </p>
    </div>
  );
}
