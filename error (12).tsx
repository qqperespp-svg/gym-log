"use client";

import { useEffect } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="w-full max-w-md text-center">
      <span className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-lime-400/10 text-4xl text-lime-400">
        💪
      </span>
      <h1 className="text-2xl font-black tracking-[-0.03em] text-white">
        Ups, coś poszło nie tak
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Nie udało się załadować tej strony. Twoje dane są bezpieczne — spróbuj
        ponownie za chwilę.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <button onClick={() => reset()} className="button-primary">
          Spróbuj ponownie
        </button>
        <button onClick={() => window.location.reload()} className="button-secondary">
          Przeładuj stronę
        </button>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Jeśli problem się powtarza, użyj twardego odświeżenia (Ctrl+Shift+R) — po aktualizacji
        aplikacji otwarta karta może trzymać starą wersję strony.
      </p>
    </div>
  );
}
