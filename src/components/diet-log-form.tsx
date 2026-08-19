"use client";

import { useMemo, useState } from "react";
import { Beef, Croissant, Droplets, Plus, Scale, Search, X } from "lucide-react";
import { logDietEntryAction } from "@/actions/diet";
import { formatMacro, kcalFromMacros, round1 } from "@/lib/diet";
import type { FoodProduct } from "@/db/schema";

function formatKcal(n: number): string {
  return n.toLocaleString("pl-PL");
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}



export function DietLogForm({
  products,
  meals,
  mealNames,
}: {
  products: FoodProduct[];
  meals: number;
  mealNames: string[];
}) {
  const [proteinPer100, setProteinPer100] = useState("");
  const [fatPer100, setFatPer100] = useState("");
  const [carbsPer100, setCarbsPer100] = useState("");
  const [grams, setGrams] = useState("100");
  const [note, setNote] = useState("");
  const [meal, setMeal] = useState("1");
  const [query, setQuery] = useState("");

  const g = Math.max(0, Number(grams) || 0);
  // Makro przeliczone na gramaturę (na 100 g → na podaną ilość).
  const computed = useMemo(
    () => ({
      protein: round1((Number(proteinPer100) || 0) * (g / 100)),
      fat: round1((Number(fatPer100) || 0) * (g / 100)),
      carbs: round1((Number(carbsPer100) || 0) * (g / 100)),
    }),
    [proteinPer100, fatPer100, carbsPer100, g],
  );
  const kcal = useMemo(
    () => kcalFromMacros(computed.protein, computed.fat, computed.carbs),
    [computed],
  );

  const matches = useMemo(() => {
    const q = norm(query);
    if (q.length < 2) return [];
    return products.filter((p) => norm(p.name).includes(q)).slice(0, 8);
  }, [query, products]);

  function pickProduct(p: FoodProduct) {
    setProteinPer100(String(p.protein));
    setFatPer100(String(p.fat));
    setCarbsPer100(String(p.carbs));
    setNote(p.barcode ? `${p.name} (${p.barcode})` : p.name);
    setQuery("");
  }

  const mealOptions = Array.from({ length: Math.max(1, Math.min(meals, 10)) }, (_, i) => i + 1);
  const mealLabel = (m: number) => mealNames[m - 1] || `Posiłek ${m}`;

  return (
    <form action={logDietEntryAction} className="space-y-4">
      <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
          <Search size={12} className="text-lime-400" /> Znajdź produkt z katalogu (po nazwie)
        </p>
        <div className="relative">
          <input
            className="input"
            type="text"
            placeholder="np. sky, twaróg, kurczak, płatki owsiane…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              aria-label="Wyczyść"
            >
              <X size={15} />
            </button>
          )}
        </div>
        {matches.length > 0 && (
          <div className="mt-2 space-y-1">
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickProduct(p)}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/[.03] px-3 py-2 text-left transition hover:bg-lime-400/10"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white">{p.name}</span>
                  {p.barcode && <span className="text-[10px] text-slate-500">kod: {p.barcode}</span>}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-slate-400">
                  {p.kcal} kcal · B{p.protein} T{p.fat} W{p.carbs}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
          Posiłek
          <span className="select-shell !min-h-12">
            <select name="meal" value={meal} onChange={(event) => setMeal(event.target.value)}>
              {mealOptions.map((m) => (
                <option key={m} value={m}>
                  {m}. {mealLabel(m)}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="field-label">
          Gramatura (g)
          <span className="input-shell !min-h-12">
            <Scale size={16} />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="np. 150"
              value={grams}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setGrams(event.target.value)}
            />
          </span>
        </label>
        <label className="field-label">
          Białko (g/100g)
          <span className="input-shell !min-h-12">
            <Beef size={16} />
            <input
              name="proteinPer100"
              type="number"
              min="0"
              step="0.1"
              placeholder="np. 20,5"
              value={proteinPer100}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setProteinPer100(event.target.value)}
              required
            />
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field-label">
          Tłuszcze (g/100g)
          <span className="input-shell !min-h-12">
            <Droplets size={16} />
            <input
              name="fatPer100"
              type="number"
              min="0"
              step="0.1"
              placeholder="np. 5,5"
              value={fatPer100}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setFatPer100(event.target.value)}
              required
            />
          </span>
        </label>
        <label className="field-label">
          Węglowodany (g/100g)
          <span className="input-shell !min-h-12">
            <Croissant size={16} />
            <input
              name="carbsPer100"
              type="number"
              min="0"
              step="0.1"
              placeholder="np. 15,2"
              value={carbsPer100}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setCarbsPer100(event.target.value)}
              required
            />
          </span>
        </label>
        <label className="field-label sm:col-span-2 lg:col-span-2">
          Notatka (opcjonalnie)
          <input
            className="input"
            name="note"
            type="text"
            maxLength={200}
            placeholder="np. śniadanie, obiad, posiłek potreningowy…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>

      {/* Podsumowanie wpisu przeliczone na gramaturę */}
      <div className="flex items-end justify-between gap-4 rounded-2xl border border-lime-400/15 bg-lime-400/[.06] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-lime-400/70">
            Wpis na {Math.round(g).toLocaleString("pl-PL")} g
          </p>
          <p className="mt-0.5 text-sm text-slate-300">
            <b className="text-lime-300">{formatKcal(kcal)} kcal</b> · B {formatMacro(computed.protein)} g · T{" "}
            {formatMacro(computed.fat)} g · W {formatMacro(computed.carbs)} g
          </p>
        </div>
        <button type="submit" className="button-primary shrink-0">
          <Plus size={17} /> Dodaj
        </button>
      </div>

      {/* Przesyłane wartości = makro przeliczone na gramaturę */}
      <input type="hidden" name="protein" value={computed.protein} />
      <input type="hidden" name="fat" value={computed.fat} />
      <input type="hidden" name="carbs" value={computed.carbs} />
    </form>
  );
}
