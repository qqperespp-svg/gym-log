"use client";

import { useMemo, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { addRecipeAction, deleteRecipeAction, logRecipeAction } from "@/actions/diet";
import { formatMacroTriplet } from "@/lib/diet";
import { suggestMealByHour } from "@/lib/i18n";
import { matchesWords } from "@/lib/search";
import type { FoodProduct, Recipe } from "@/db/schema";

type Item = { productId: number; name: string; grams: string; protein: number; fat: number; carbs: number; kcal: number };

function parseRecipeItems(raw: string | null): Item[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row: Partial<Item>, i: number) => ({
      productId: Number(row.productId) || 0,
      name: String(row.name ?? `Składnik ${i + 1}`),
      grams: String(row.grams ?? ""),
      protein: Number(row.protein) || 0,
      fat: Number(row.fat) || 0,
      carbs: Number(row.carbs) || 0,
      kcal: Number(row.kcal) || 0,
    }));
  } catch {
    return [];
  }
}

export function RecipeForm({ products }: { products: FoodProduct[] }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    return products.filter((p) => matchesWords(p.name, query)).slice(0, 6);
  }, [query, products]);

  const sums = useMemo(
    () =>
      items.reduce(
        (a, i) => ({
          protein: a.protein + (i.protein * (Number(i.grams) || 0)) / 100,
          fat: a.fat + (i.fat * (Number(i.grams) || 0)) / 100,
          carbs: a.carbs + (i.carbs * (Number(i.grams) || 0)) / 100,
          kcal: a.kcal + (i.kcal * (Number(i.grams) || 0)) / 100,
        }),
        { protein: 0, fat: 0, carbs: 0, kcal: 0 },
      ),
    [items],
  );

  function addItem(p: FoodProduct) {
    setItems((cur) => [
      ...cur,
      { productId: p.id, name: p.name, grams: "100", protein: p.protein, fat: p.fat, carbs: p.carbs, kcal: p.kcal },
    ]);
    setQuery("");
  }

  return (
    <form action={addRecipeAction} className="space-y-3">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((i) => ({
            productId: i.productId,
            grams: Number(i.grams) || 0,
            name: i.name,
            protein: i.protein,
            fat: i.fat,
            carbs: i.carbs,
            kcal: i.kcal,
          })),
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field-label sm:col-span-2">
          Nazwa przepisu
          <input
            className="input"
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Obiad — kurczak z ryżem"
            required
            minLength={2}
          />
        </label>
      </div>
      <div className="relative">
        <input
          className="input"
          type="text"
          placeholder="Dodaj produkt (szukaj po nazwie)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full space-y-1 rounded-xl border border-white/10 bg-[#11171f] p-2 shadow-xl">
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addItem(p)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-bold text-white">{p.name}</span>
                  {p.userId !== null && (
                    <span className="shrink-0 rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-300">
                      wpis gymrata
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] text-slate-400">{p.kcal} kcal/100g</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border border-white/[.06] bg-black/15 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{item.name}</span>
              <input
                type="number"
                min="0"
                step="1"
                className="input !min-h-9 !w-20 !px-2 !py-1 text-center"
                value={item.grams}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, grams: e.target.value } : it)))}
              />
              <span className="text-[11px] text-slate-500">g</span>
              <button
                type="button"
                onClick={() => setItems((cur) => cur.filter((_, i) => i !== idx))}
                className="text-slate-500 hover:text-rose-300"
                aria-label="Usuń"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <p className="text-xs text-slate-400">
            Suma: <b className="text-lime-300">{Math.round(sums.kcal).toLocaleString("pl-PL")} kcal</b> ·{" "}
            {formatMacroTriplet(sums.protein, sums.fat, sums.carbs)}
          </p>
        </div>
      )}
      <button type="submit" className="button-primary">
        <Save size={16} /> Zapisz przepis
      </button>
    </form>
  );
}

export function RecipeItem({
  recipe,
  meals = 3,
  mealNames = [],
}: {
  recipe: Recipe;
  meals?: number;
  mealNames?: string[];
}) {
  const [items, setItems] = useState<Item[]>(() => parseRecipeItems(recipe.items));
  const mealOptions = Array.from({ length: Math.max(1, Math.min(meals, 10)) }, (_, i) => i + 1);
  const mealLabel = (m: number) => mealNames[m - 1] || `Posiłek ${m}`;
  const [meal, setMeal] = useState(() => String(Math.min(suggestMealByHour(), mealOptions.length)));
  const sumGrams = items.reduce((s, i) => s + (Number(i.grams) || 0), 0);
  const sums = items.reduce(
    (a, i) => ({
      protein: a.protein + (i.protein * (Number(i.grams) || 0)) / 100,
      fat: a.fat + (i.fat * (Number(i.grams) || 0)) / 100,
      carbs: a.carbs + (i.carbs * (Number(i.grams) || 0)) / 100,
      kcal: a.kcal + (i.kcal * (Number(i.grams) || 0)) / 100,
    }),
    { protein: 0, fat: 0, carbs: 0, kcal: 0 },
  );
  const hasItemMacros = sums.protein + sums.fat + sums.carbs + sums.kcal > 0;
  const protein = hasItemMacros ? sums.protein : recipe.protein;
  const fat = hasItemMacros ? sums.fat : recipe.fat;
  const carbs = hasItemMacros ? sums.carbs : recipe.carbs;
  const kcal = hasItemMacros ? sums.kcal : recipe.kcal;

  return (
    <div className="rounded-xl border border-white/[.06] bg-black/15 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{recipe.name}</p>
        <form action={deleteRecipeAction.bind(null, recipe.id)}>
          <button type="submit" className="text-xs text-slate-500 hover:text-rose-300">
            Usuń
          </button>
        </form>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {Math.round(kcal).toLocaleString("pl-PL")} kcal · {formatMacroTriplet(protein, fat, carbs)}
        {sumGrams > 0 ? ` · ${Math.round(sumGrams)} g` : ""}
      </p>
      {items.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {items.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{item.name}</span>
              <input
                type="number"
                min="0"
                step="1"
                className="input !min-h-8 !w-16 !px-1.5 !py-0.5 text-center text-xs"
                value={item.grams}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, grams: e.target.value } : it)))}
                aria-label={`Gramy ${item.name}`}
              />
              <span className="text-[10px] text-slate-500">g</span>
            </div>
          ))}
        </div>
      )}
      <form action={logRecipeAction} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={recipe.id} />
        <input type="hidden" name="date" value={new Date().toISOString().slice(0, 10)} />
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items.map((i) => ({
              productId: i.productId,
              name: i.name,
              grams: Number(i.grams) || 0,
              protein: i.protein,
              fat: i.fat,
              carbs: i.carbs,
              kcal: i.kcal,
            })),
          )}
        />
        <input type="hidden" name="grams" value={String(Math.round(sumGrams) || "")} />
        <label className="field-label !space-y-1 min-w-[8rem] flex-1">
          <span className="text-[10px]">Posiłek</span>
          <span className="select-shell !min-h-9">
            <select name="meal" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {mealOptions.map((m) => (
                <option key={m} value={m}>
                  {m}. {mealLabel(m)}
                </option>
              ))}
            </select>
          </span>
        </label>
        <button type="submit" className="button-primary px-3 py-1.5 text-xs">
          <Plus size={13} /> Dodaj do dziennika
        </button>
      </form>
    </div>
  );
}
