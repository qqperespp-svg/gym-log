"use client";

import { useActionState, useState } from "react";
import { KeyRound, LoaderCircle, MailCheck } from "lucide-react";
import { sendMagicLinkAction } from "@/actions/auth";

export function MagicLoginForm() {
  const [state, formAction] = useActionState(sendMagicLinkAction, undefined);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3 text-left text-sm font-bold text-slate-300 transition hover:border-lime-400/30 hover:text-lime-300"
      >
        <KeyRound size={15} className="mr-2 inline text-lime-400" />
        Zaloguj się linkiem e-mail (bez hasła)
      </button>

      {open && (
        <form action={formAction} className="mt-3 rounded-2xl border border-lime-400/15 bg-lime-400/[.04] p-4">
          {state?.error && (
            <p className="mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
              {state.error}
            </p>
          )}
          {state?.success ? (
            <div className="text-sm">
              <p className="flex items-center gap-2 font-bold text-lime-300">
                <MailCheck size={16} /> Sprawdź skrzynkę: {state.email}
              </p>
              <p className="mt-1 text-slate-400">Wysłaliśmy Ci link logowania (ważny 15 minut).</p>
              {state.loginUrl && (
                <p className="mt-3 rounded-xl bg-black/20 p-3 text-xs text-slate-400">
                  <b className="text-slate-200">Tryb demo (brak SMTP):</b>{" "}
                  <a href={state.loginUrl} className="break-all text-lime-300 underline">
                    {state.loginUrl}
                  </a>
                </p>
              )}
            </div>
          ) : (
            <>
              <label className="field-label">
                Adres e-mail
                <input
                  className="input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ty@email.pl"
                  defaultValue={state?.email ?? ""}
                  required
                />
              </label>
              <button type="submit" className="button-primary mt-3 w-full justify-center py-2.5 text-sm">
                <LoaderCircle size={16} className="opacity-0" /> Wyślij link logowania
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
