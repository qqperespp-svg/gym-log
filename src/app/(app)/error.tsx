"use client";

import { useEffect } from "react";

export default function AppError({
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
    <div className="empty-state">
      <span className="empty-icon">😵</span>
      <h3>Coś poszło nie tak</h3>
      <p>
        Wystąpił nieoczekiwany błąd podczas ładowania tej strony. Spróbuj ponownie —
        Twoje dane są bezpieczne.
      </p>
      <button onClick={() => reset()} className="button-primary">
        Spróbuj ponownie
      </button>
    </div>
  );
}
