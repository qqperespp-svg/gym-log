"use client";

import { useMemo, useState } from "react";
import { Beef, Croissant, Droplets, Plus, Search, X } from "lucide-react";
import { logDietEntryAction } from "@/actions/diet";
import { kcalFromMacros } from "@/lib/diet";
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

export function DietLogForm({ products, meals }: { products: FoodProduct[]; meals: number }) {
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [note, setNote] = useState("");
  const [meal, setMeal] = useState("1");
  const [query, setQuery] = useState("");

  const kcal = useMemo(
    () => kcalFromMacros(Number(protein) || 0, Number(fat) || 0, Number(carbs) || 0),
    [protein, fat, carbs],
  );

  const matches = useMemo(() => {
    const q = norm(query);
    if (q.length < 2) return [];
    return products
      .filter((p) => norm(p.name).includes(q))
      .slice(0, 8);
  }, [query, products]);

  function pickProduct(p: FoodProduct) {
    setProtein(String(p.protein));
    setFat(String(p.fat));
    setCarbs(String(p.carbs));
    setNote(p.barcode ? `${p.name} (${p.barcode})` : p.name);
    setQuery("");
  }

  const mealOptions = Array.from({ length: Math.max(1, Math.min(meals, 10)) }, (_, i) => i + 1);

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
                  {p.barcode && (
                    <span className="text-[10px] text-slate-500">kod: {p.barcode}</span>
                  )}
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
                  Posiłek {m}
                </option>
              ))}
            </select>
          </span>
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
              onFocus={(event) => event.target.select()}
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
              onFocus={(event) => event.target.select()}
              onChange={(event) => setFat(event.target.value)}
              required
            />
          </span>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              onFocus={(event) => event.target.select()}
              onChange={(event) => setCarbs(event.target.value)}
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
        <div className="flex items-end justify-between gap-4">
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
