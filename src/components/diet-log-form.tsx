"use client";

import { useMemo, useState } from "react";
import { Beef, Croissant, Droplets, Plus } from "lucide-react";
import { logDietEntryAction } from "@/actions/diet";
import { kcalFromMacros } from "@/lib/diet";

function formatKcal(n: number): string {
  return n.toLocaleString("pl-PL");
}

export function DietLogForm() {
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");

  const kcal = useMemo(
    () => kcalFromMacros(Number(protein) || 0, Number(fat) || 0, Number(carbs) || 0),
    [protein, fat, carbs],
  );

  return (
    <form action={logDietEntryAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field-label">
          Data
          <input
            type="date"
            name="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
            required
          />
        </label>
        <label className="field-label">
          Białko (g)
          <span className="input-shell !min-h-12">
            <Beef size={16} />
            <input
              name="protein"
              type="number"
              min="0"
              step="1"
              placeholder="np. 45"
              value={protein}
              onChange={(event) => setProtein(event.target.value)}
              required
            />
          </span>
        </label>
        <label className="field-label">
          Tłuszcze (g)
          <span className="input-shell !min-h-12">
            <Droplets size={16} />
            <input
              name="fat"
              type="number"
              min="0"
              step="1"
              placeholder="np. 30"
              value={fat}
              onChange={(event) => setFat(event.target.value)}
              required
            />
          </span>
        </label>
        <label className="field-label">
          Węglowodany (g)
          <span className="input-shell !min-h-12">
            <Croissant size={16} />
            <input
              name="carbs"
              type="number"
              min="0"
              step="1"
              placeholder="np. 180"
              value={carbs}
              onChange={(event) => setCarbs(event.target.value)}
              required
            />
          </span>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field-label sm:col-span-2 lg:col-span-3">
          Notatka (opcjonalnie)
          <input
            className="input"
            name="note"
            type="text"
            maxLength={200}
            placeholder="np. śniadanie, obiad, posiłek potreningowy…"
          />
        </label>
        <div className="flex items-end justify-between gap-4 sm:col-span-2 lg:col-span-1">
          <div className="flex-1 rounded-xl bg-lime-400/10 px-4 py-2.5 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-lime-400/70">
              kcal
            </p>
            <b className="text-lg font-black text-lime-300">{formatKcal(kcal)}</b>
          </div>
          <button type="submit" className="button-primary">
            <Plus size={17} /> Dodaj
          </button>
        </div>
      </div>
    </form>
  );
}
