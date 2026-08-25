"use client";

import { useState } from "react";
import { Sparkles, LoaderCircle, X, CheckCircle2 } from "lucide-react";
import { formatMacro, kcalFromMacros, round1 } from "@/lib/diet";
import { logMealEstimateAction } from "@/actions/diet";

export function SuggestMealTile({
  remaining,
  products,
}: {
  remaining: { protein: number; fat: number; carbs: number; kcal: number };
  products: Array<{ id: number; name: string; protein: number; fat: number; carbs: number; kcal: number; barcode?: string | null; userId: number | null }>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ name: string; grams: number; protein: number; fat: number; carbs: number; kcal: number }>>([]);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remaining: JSON.stringify(remaining),
          products: JSON.stringify(
            products.map((p) => ({
              name: p.name,
              protein: p.protein,
              fat: p.fat,
              carbs: p.carbs,
              kcal: p.kcal,
              barcode: p.barcode ?? null,
            }))
          ),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Nie udało się uzyskać propozycji od AI.");
        return;
      }
      setItems(Array.isArray(body.items) ? body.items : []);
      if (!body.items?.length) setError("Nie udało się wygenerować propozycji — spróbuj ponownie.");
    } catch {
      setError("Błąd połączenia — spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  const total = items.reduce(
    (a, it) => {
      const g = Math.max(0, Number(it.grams) || 0) / 100;
      return {
        protein: a.protein + round1((Number(it.protein) || 0) * g),
        fat: a.fat + round1((Number(it.fat) || 0) * g),
        carbs: a.carbs + round1((Number(it.carbs) || 0) * g),
        kcal: a.kcal + kcalFromMacros(round1((Number(it.protein) || 0) * g), round1((Number(it.fat) || 0) * g), round1((Number(it.carbs) || 0) * g)),
      };
    },
    { protein: 0, fat: 0, carbs: 0, kcal: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSuggest} disabled={loading} className="button-primary">
          <Sparkles size={16} /> AI: Zaproponuj posiłki
        </button>
        <span className="text-xs text-slate-500">AI (Gemini) zaproponuje dania na podstawie pozostałych makro.</span>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <LoaderCircle size={16} className="animate-spin text-lime-400" /> AI generuje propozycje…
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{error}</p>
      )}

      {items.length > 0 && (
        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[.05] p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-lime-400">
            Propozycja AI — popraw gramaturę i dodaj
          </p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[.06] bg-black/15 px-3 py-2">
                <span className="min-w-0 flex-1 break-words whitespace-normal text-sm font-bold text-white">{it.name}</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="input !min-h-9 !w-20 !px-2 !py-1 text-center"
                  value={it.grams}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setItems((cur) => cur.map((x, i) => (i === idx ? { ...x, grams: Number(e.target.value) || 0 } : x)))
                  }
                />
                <span className="text-[11px] text-slate-500">g</span>
                <span className="text-[11px] text-slate-400">
                  B {formatMacro(round1(it.protein * (Number(it.grams) || 0) / 100))} · T{" "}
                  {formatMacro(round1(it.fat * (Number(it.grams) || 0) / 100))} · W{" "}
                  {formatMacro(round1(it.carbs * (Number(it.grams) || 0) / 100))}
                </span>
                <button type="button" onClick={() => setItems((cur) => cur.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-rose-300" aria-label="Usuń">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Razem: <b className="text-lime-300">{total.kcal.toLocaleString("pl-PL")} kcal</b> · B{" "}
            {formatMacro(total.protein)} g · T {formatMacro(total.fat)} g · W {formatMacro(total.carbs)} g
          </p>

          <form action={logMealEstimateAction} className="mt-4 grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="items" value={JSON.stringify(items)} />
            <label className="field-label">
              Data
              <input className="input" type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
            <label className="field-label">
              Posiłek
              <select className="input" name="meal" defaultValue="1">
                <option value="1">1. Posiłek 1</option>
                <option value="2">2. Posiłek 2</option>
                <option value="3">3. Posiłek 3</option>
                <option value="4">4. Posiłek 4</option>
                <option value="5">5. Posiłek 5</option>
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" className="button-primary w-full justify-center">
                <CheckCircle2 size={17} /> Dodaj do dziennika
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
