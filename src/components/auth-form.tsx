"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Dumbbell, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { loginAction, registerAction } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function AuthForm({
  mode,
  prefilledEmail = "",
}: {
  mode: "login" | "register";
  prefilledEmail?: string;
}) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useActionState(action, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-10 inline-flex items-center gap-3 text-white">
        <span className="grid size-11 place-items-center rounded-2xl bg-lime-400 text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.24)]">
          <Dumbbell size={23} />
        </span>
        <span className="text-xl font-black tracking-[-0.04em]">
          GYM<span className="text-lime-400">RAT</span>
        </span>
      </Link>

      <div className="mb-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-lime-400">
          {isLogin ? "Wracamy do pracy" : "Dołącz do ekipy"}
        </p>
        <h1 className="text-4xl font-black tracking-[-0.045em] text-white">
          {isLogin ? "Zaloguj się" : "Załóż konto"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {isLogin
            ? "Twoje rekordy i kolejny trening już czekają."
            : "Zacznij śledzić progres — bez arkuszy i notatek."}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {!isLogin && (
          <label className="field-label">
            Imię
            <span className="input-shell">
              <UserRound size={18} />
              <input name="name" autoComplete="name" placeholder="np. Bartek" required minLength={2} />
            </span>
          </label>
        )}
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
              defaultValue={prefilledEmail}
            />
          </span>
        </label>
        <label className="field-label">
          Hasło
          <span className="input-shell">
            <LockKeyhole size={18} />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="Minimum 8 znaków"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
              title={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
              className="shrink-0 text-slate-500 transition hover:text-lime-300"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {state?.error && (
          <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
            {state.error}
          </p>
        )}

        {isLogin && state?.emailNotFound && (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
            <p className="font-bold">Nie ma konta z tym adresem e-mail.</p>
            <p className="mt-1 text-xs leading-5 text-amber-200/80">
              Aplikacja była aktualizowana i baza danych mogła zostać odświeżona.
              Odtwórz konto jednym kliknięciem — wystarczy ustawić nowe hasło.
            </p>
            <Link
              href={`/register?email=${encodeURIComponent(state.email ?? "")}`}
              className="button-primary mt-3 w-full justify-center py-2.5 text-sm"
            >
              Odtwórz konto ({state.email})
            </Link>
          </div>
        )}

        <SubmitButton
          pendingLabel={isLogin ? "Logowanie…" : "Tworzenie konta…"}
          className="button-primary w-full justify-center py-3.5"
        >
          {isLogin ? "Wejdź na trening" : "Utwórz konto"}
        </SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-slate-400">
        {isLogin ? "Pierwszy raz tutaj?" : "Masz już konto?"}{" "}
        <Link
          className="font-bold text-white hover:text-lime-400"
          href={isLogin ? "/register" : "/login"}
        >
          {isLogin ? "Załóż konto" : "Zaloguj się"}
        </Link>
      </p>
    </div>
  );
}
