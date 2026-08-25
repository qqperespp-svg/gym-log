"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, X } from "lucide-react";
import { updateDietLogAction } from "@/actions/diet";

export type DietLogEditData = {
  date: string;
  grams: number | null;
  protein: number;
  fat: number;
  carbs: number;
  mealNumber: number | null;
  note: string | null;
  mealOptions: Array<{ value: number; label: string }>;
};

export function EditDietLogButton({ id, initial }: { id: number; initial: DietLogEditData }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save(formData: FormData) {
    startTransition(async () => {
      await updateDietLogAction(id, formData);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="button-secondary px-2 py-1 text-xs text-lime-300 hover:text-lime-200"
      >
        <Pencil size={13} /> Edytuj
      </button>
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-diet-log-${id}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(false);
          }}
        >
          <form
            action={save}
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#11171f] p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Historia posiłków</p>
                <h2 id={`edit-diet-log-${id}`} className="text-xl font-black text-white">
                  Edytuj wpis
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="icon-button"
                aria-label="Zamknij edycję"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                Data
                <input
                  className="input"
                  name="date"
                  type="date"
                  defaultValue={initial.date}
                  required
                />
              </label>
              <label className="field-label">
                Posiłek
                <span className="select-shell">
                  <select name="meal" defaultValue={initial.mealNumber ?? ""}>
                    <option value="">Bez przypisania</option>
                    {initial.mealOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="field-label">
                Gramatura (g)
                <input
                  className="input"
                  name="grams"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.1"
                  defaultValue={initial.grams ?? ""}
                  placeholder="np. 150"
                />
              </label>
              <label className="field-label">
                Białko (g)
                <input
                  className="input"
                  name="protein"
                  type="number"
                  min="0"
                  max="9999"
                  step="0.1"
                  defaultValue={initial.protein}
                  required
                />
              </label>
              <label className="field-label">
                Tłuszcze (g)
                <input
                  className="input"
                  name="fat"
                  type="number"
                  min="0"
                  max="9999"
                  step="0.1"
                  defaultValue={initial.fat}
                  required
                />
              </label>
              <label className="field-label">
                Węglowodany (g)
                <input
                  className="input"
                  name="carbs"
                  type="number"
                  min="0"
                  max="9999"
                  step="0.1"
                  defaultValue={initial.carbs}
                  required
                />
              </label>
              <label className="field-label sm:col-span-2">
                Notatka
                <textarea
                  className="input min-h-24 resize-y"
                  name="note"
                  maxLength={500}
                  defaultValue={initial.note ?? ""}
                  placeholder="Opcjonalna notatka…"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="button-secondary justify-center"
                disabled={pending}
              >
                Anuluj
              </button>
              <button type="submit" className="button-primary justify-center" disabled={pending}>
                {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Pencil size={16} />}
                {pending ? "Zapisywanie…" : "Zapisz zmiany"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
