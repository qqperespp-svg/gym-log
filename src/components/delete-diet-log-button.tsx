"use client";

import { useTransition } from "react";
import { deleteDietLogAction } from "@/actions/diet";

export function DeleteDietLogButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!window.confirm("Usunąć wpis spożycia?")) return;
    startTransition(() => {
      void deleteDietLogAction(id);
    });
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="button-secondary text-xs px-2 py-1 text-rose-300 hover:text-rose-200"
    >
      {pending ? "Usuwanie…" : "Usuń"}
    </button>
  );
}
