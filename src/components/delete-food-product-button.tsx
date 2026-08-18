"use client";

import { useTransition } from "react";
import { deleteFoodProductAction } from "@/actions/diet";

export function DeleteFoodProductButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!window.confirm("Usunąć produkt z katalogu?")) return;
    startTransition(() => {
      void deleteFoodProductAction(id);
    });
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="button-secondary px-2 py-1 text-xs text-rose-300 hover:text-rose-200"
    >
      {pending ? "Usuwanie…" : "Usuń"}
    </button>
  );
}
