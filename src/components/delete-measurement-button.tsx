"use client";

import { useTransition } from "react";
import { deleteBodyAction } from "@/actions/body";

export function DeleteMeasurementButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!window.confirm("Usunąć pomiar?")) return;
    startTransition(() => {
      void deleteBodyAction(id);
    });
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="button-secondary text-xs py-1 px-2 text-rose-300 hover:text-rose-200"
    >
      {pending ? "Usuwanie…" : "Usuń"}
    </button>
  );
}
