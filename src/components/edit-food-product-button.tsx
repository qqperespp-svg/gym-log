"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { updateFoodProductAction } from "@/actions/diet";
import type { FoodProduct } from "@/db/schema";

export function EditFoodProductButton({ product }: { product: FoodProduct }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="button-secondary px-2 py-1 text-xs text-sky-300 hover:text-sky-200"
        title="Edytuj produkt"
      >
        <Pencil size={14} /> Edytuj
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await updateFoodProductAction(formData);
        });
      }}
      className="rounded-xl border border-sky-400/20 bg-sky-400/[.06] p-3"
    >
      <input type="hidden" name="id" value={product.id} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-sky-300">Edytuj produkt</p>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white" aria-label="Zamknij edycję">
          <X size={14} />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-[11px] font-bold text-slate-400">
          Nazwa
          <input className="input !min-h-9 !px-2 !py-1 text-sm" name="name" type="text" defaultValue={product.name} required minLength={2} maxLength={255} />
        </label>
        <label className="block text-[11px] font-bold text-slate-400">
          Kod kreskowy
          <input className="input !min-h-9 !px-2 !py-1 text-sm" name="barcode" type="text" defaultValue={product.barcode ?? ""} maxLength={64} />
        </label>
        <label className="block text-[11px] font-bold text-slate-400">
          Białko (g/100g)
          <input className="input !min-h-9 !px-2 !py-1 text-sm" name="protein" type="number" min="0" step="0.1" defaultValue={product.protein} required />
        </label>
        <label className="block text-[11px] font-bold text-slate-400">
          Tłuszcze (g/100g)
          <input className="input !min-h-9 !px-2 !py-1 text-sm" name="fat" type="number" min="0" step="0.1" defaultValue={product.fat} required />
        </label>
        <label className="block text-[11px] font-bold text-slate-400">
          Węglowodany (g/100g)
          <input className="input !min-h-9 !px-2 !py-1 text-sm" name="carbs" type="number" min="0" step="0.1" defaultValue={product.carbs} required />
        </label>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="submit" disabled={pending} className="button-primary px-3 py-1.5 text-xs">
          {pending ? "Zapisywanie…" : "Zapisz"}
        </button>
      </div>
    </form>
  );
}
