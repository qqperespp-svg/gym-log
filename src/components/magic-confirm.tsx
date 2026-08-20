"use client";

import { useActionState } from "react";
import { LoaderCircle, LogIn, XCircle } from "lucide-react";
import { completeMagicLoginAction } from "@/actions/auth";

export function MagicConfirm({ token }: { token: string }) {
  const [state, formAction] = useActionState(completeMagicLoginAction.bind(null, token), undefined);

  if (state?.error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-6 text-center">
        <XCircle size={30} className="mx-auto text-rose-300" />
        <h2 className="mt-3 text-xl font-black text-white">Link wygasł lub jest nieprawidłowy</h2>
        <p className="mt-2 text-sm text-slate-400">{state.error}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-lime-400/15 bg-lime-400/[.04] p-6 text-center">
      <h2 className="text-xl font-black text-white">Jesteś o krok</h2>
      <p className="mt-2 text-sm text-slate-400">Kliknij, aby zalogować się do GYMRAT.</p>
      <button type="submit" className="button-primary mt-5 w-full justify-center">
        <LogIn size={17} /> Zaloguj się
      </button>
    </form>
  );
}
