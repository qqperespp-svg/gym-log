"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import { updateDietLogAction } from "@/actions/diet";
import { formatMacro, kcalFromMacros, round1 } from "@/lib/diet";

export type EditableDietLog = {
  id: number;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  grams: number;
  mealNumber: number | null;
  note: string | null;
};

const MEAL_LABELS = ["1. Śniadanie", "2. Obiad", "3. Kolacja"];

/**
 * Edycja wpisu dziennika żywienia: zmieniasz gramaturę, a makro (B/T/W)
 * oraz kcal przeliczają się automatycznie proporcjonalnie od razu w formularzu.
 */
export function EditDietLogButton({ log }: { log: EditableDietLog }) {
  const [open, setOpen] = useState(false);
  const [grams, setGrams] = useState(() => String(log.grams > 0 ? log.grams : 100));
  const [note, setNote] = useState(log.note ?? "");
  const [meal, setMeal] = useState(String(log.mealNumber ?? 1));

  // Bazą są makro z zapisanej porcji przeliczone na wartości „na 100 g”:
  // edycja startuje od realnej gramatury (log.grams), a makro skalują się
  // proporcjonalnie do zmienionej ilości — dokładnie jak w formularzu dodawania.
  const baseGrams = log.grams > 0 ? log.grams : 100;
  const baseProtein = baseGrams > 0 ? (log.protein / baseGrams) * 100 : 0;
  const baseFat = baseGrams > 0 ? (log.fat / baseGrams) * 100 : 0;
  const baseCarbs = baseGrams > 0 ? (log.carbs / baseGrams) * 100 : 0;

  const g = Math.max(0, Number(grams) || 0);
  const computed = useMemo(() => {
    const protein = round1(baseProtein * (g / 100));
    const fat = round1(baseFat * (g / 100));
    const carbs = round1(baseCarbs * (g / 100));
    return {
      protein,
      fat,
      carbs,
      kcal: kcalFromMacros(protein, fat, carbs),
    };
  }, [g, baseProtein, baseFat, baseCarbs]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="button-secondary text-xs px-2 py-1 text-amber-300 hover:text-amber-200"
      >
        Edytuj
      </button>
    );
  }

  const mealOptions = Array.from({ length: Math.max(3, log.mealNumber ?? 1) }, (_, i) => i + 1);

  return (
    <form action={updateDietLogAction} className="space-y-2 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-3">
      <input type="hidden" name="id" value={log.id} />
      <input type="hidden" name="grams" value={grams} />
      <input type="hidden" name="proteinPer100" value={baseProtein} />
      <input type="hidden" name="fatPer100" value={baseFat} />
      <input type="hidden" name="carbsPer100" value={baseCarbs} />

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Edytuj wpis</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-slate-500 hover:text-white"
          aria-label="Anuluj"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[10px] font-bold text-slate-400">
          Gramatura (g)
          <input
            type="number"
            min="0"
            step="1"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            required
          />
        </label>
        <label className="text-[10px] font-bold text-slate-400">
          Posiłek
          <select
            name="meal"
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {mealOptions.map((n) => (
              <option key={n} value={n}>
                {MEAL_LABELS[n - 1] ?? `Posiłek ${n}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-slate-400">
          Notatka
          <input
            name="note"
            type="text"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2">
        <div className="text-xs">
          <span className="text-slate-500">B: {formatMacro(computed.protein)} g</span>
          <span className="mx-2 text-slate-600">|</span>
          <span className="text-slate-500">T: {formatMacro(computed.fat)} g</span>
          <span className="mx-2 text-slate-600">|</span>
          <span className="text-slate-500">W: {formatMacro(computed.carbs)} g</span>
          <span className="mx-2 text-slate-600">|</span>
          <span className="font-bold text-amber-300">{computed.kcal.toLocaleString("pl-PL")} kcal</span>
        </div>
        <FormSubmitButton />
      </div>
    </form>
  );
}

function FormSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="button-primary px-3 py-1 text-xs">
      {pending ? "Zapisuję…" : "Zapisz"}
    </button>
  );
}
