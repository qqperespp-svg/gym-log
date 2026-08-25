"use client";

import { useMemo, useState } from "react";
import { FilterX, Search, Star } from "lucide-react";
import type { FoodProduct } from "@/db/schema";
import { DeleteFoodProductButton } from "@/components/delete-food-product-button";
import { EditFoodProductButton } from "@/components/edit-food-product-button";
import { toggleFavoriteProductAction } from "@/actions/diet";
import { DIET_LABELS, productLabels } from "@/lib/labels";
import { matchesWords } from "@/lib/search";

/** Pusta wartość = brak ograniczenia; zwraca liczbę lub null. */
function rangeVal(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function FoodCatalogSearch({
  products,
  userId,
  favoriteIds,
}: {
  products: FoodProduct[];
  userId: number;
  favoriteIds: Set<number>;
}) {
  const [query, setQuery] = useState("");
  // Wybrane etykiety (produkt pasuje, gdy ma co najmniej jedną z nich).
  const [labelKeys, setLabelKeys] = useState<string[]>([]);
  // Zakresy makro (na 100 g) — min/max.
  const [pMin, setPMin] = useState("");
  const [pMax, setPMax] = useState("");
  const [fMin, setFMin] = useState("");
  const [fMax, setFMax] = useState("");
  const [cMin, setCMin] = useState("");
  const [cMax, setCMax] = useState("");

  function toggleLabel(key: string) {
    setLabelKeys((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  function clearFilters() {
    setQuery("");
    setLabelKeys([]);
    setPMin("");
    setPMax("");
    setFMin("");
    setFMax("");
    setCMin("");
    setCMax("");
  }

  const hasActiveFilters =
    query.trim().length >= 2 ||
    labelKeys.length > 0 ||
    [pMin, pMax, fMin, fMax, cMin, cMax].some((v) => v.trim() !== "");

  const visible = useMemo(() => {
    let list = products;
    // 1) nazwa (po słowach)
    if (query.trim().length >= 2) list = list.filter((p) => matchesWords(p.name, query));
    // 2) etykiety (OR)
    if (labelKeys.length > 0) {
      list = list.filter((p) => {
        const keys = productLabels(p.protein, p.fat, p.carbs).map((l) => l.key);
        return labelKeys.some((k) => keys.includes(k));
      });
    }
    // 3) zakresy makro
    const pm = rangeVal(pMin), pM = rangeVal(pMax);
    const fm = rangeVal(fMin), fM = rangeVal(fMax);
    const cm = rangeVal(cMin), cM = rangeVal(cMax);
    list = list.filter(
      (p) =>
        (pm == null || p.protein >= pm) &&
        (pM == null || p.protein <= pM) &&
        (fm == null || p.fat >= fm) &&
        (fM == null || p.fat <= fM) &&
        (cm == null || p.carbs >= cm) &&
        (cM == null || p.carbs <= cM),
    );
    // Priorytet: dokładne dopasowanie (includes) wyżej niż pochodne (matchesWords)
    list.sort((a, b) => {
      const aExact = query.trim().length >= 2 && a.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bExact = query.trim().length >= 2 && b.name.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      return bExact - aExact;
    });
    // ulubione najpierw (po sortowaniu dokładnym)
    return [...list.filter((p) => favoriteIds.has(p.id)), ...list.filter((p) => !favoriteIds.has(p.id))].slice(0, 80);
  }, [query, products, favoriteIds, labelKeys, pMin, pMax, fMin, fMax, cMin, cMax]);

  const total = products.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-10"
            type="text"
            placeholder="Szukaj po nazwie… (np. sky, twaróg, płatki)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="text-xs text-slate-500">
          <b className="text-white">{total.toLocaleString("pl-PL")}</b> produktów
        </span>
      </div>

      {/* Filtry: etykiety */}
      <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
          Filtruj po etykiecie
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DIET_LABELS.map((l) => {
            const active = labelKeys.includes(l.key);
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => toggleLabel(l.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  active
                    ? `${l.color} ring-1 ring-white/40`
                    : "bg-white/[.04] text-slate-400 hover:bg-white/[.08] hover:text-white"
                }`}
              >
                {l.pl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtry: zakresy makro */}
      <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Zakresy makro (na 100 g)
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full bg-white/[.05] px-2 py-0.5 text-[10px] font-bold text-slate-300 transition hover:bg-white/[.1] hover:text-white"
            >
              <FilterX size={11} /> Wyczyść filtry
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: "Białko (g)", color: "text-sky-300", min: pMin, setMin: setPMin, max: pMax, setMax: setPMax },
            { label: "Tłuszcz (g)", color: "text-amber-300", min: fMin, setMin: setFMin, max: fMax, setMax: setFMax },
            { label: "Węglowodany (g)", color: "text-rose-300", min: cMin, setMin: setCMin, max: cMax, setMax: setCMax },
          ].map((r) => (
            <label key={r.label} className="block text-[11px] font-bold text-slate-400">
              <span className={r.color}>{r.label}</span>
              <span className="mt-1 flex items-center gap-1.5">
                <input
                  className="input !min-h-9 !px-2 !py-1 text-center"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="min"
                  inputMode="decimal"
                  value={r.min}
                  onChange={(e) => r.setMin(e.target.value)}
                />
                <span className="text-slate-600">–</span>
                <input
                  className="input !min-h-9 !px-2 !py-1 text-center"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="max"
                  inputMode="decimal"
                  value={r.max}
                  onChange={(e) => r.setMax(e.target.value)}
                />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Pokazano <b className="text-white">{visible.length.toLocaleString("pl-PL")}</b>{" "}
          {visible.length === 1 ? "produkt" : "produktów"}
          {hasActiveFilters && ` (z ${total.toLocaleString("pl-PL")})`}
        </span>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {visible.length ? (
          visible.map((p) => {
            const fav = favoriteIds.has(p.id);
            const labels = productLabels(p.protein, p.fat, p.carbs);
            return (
              <div key={p.id} className={`rounded-xl border border-white/[.06] px-3 py-2.5 ${p.userId === userId ? "bg-lime-400/[.04]" : "bg-black/15"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                    {p.name}
                    {p.userId === userId && (
                      <span className="ml-2 rounded-full bg-lime-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-lime-300">
                        Moje
                      </span>
                    )}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <EditFoodProductButton product={p} />
                    <button
                      type="button"
                      onClick={() => void toggleFavoriteProductAction(p.id)}
                      className={`grid size-7 place-items-center rounded-lg transition ${fav ? "text-amber-300" : "text-slate-600 hover:text-amber-300"}`}
                      aria-label={fav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                      title={fav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                    >
                      <Star size={14} fill={fav ? "currentColor" : "none"} />
                    </button>
                    {p.userId === userId && <DeleteFoodProductButton id={p.id} />}
                  </div>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                  <span className="font-bold text-lime-300">{p.kcal} kcal</span>
                  <span>B {p.protein} g</span>
                  <span>T {p.fat} g</span>
                  <span>W {p.carbs} g</span>
                  <span className="text-slate-600">/ 100 g</span>
                  {p.barcode && <span className="text-slate-600">kod: {p.barcode}</span>}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {labels.map((l) => (
                    <span key={l.key} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${l.color}`}>
                      {l.pl}
                    </span>
                  ))}
                  {p.userId !== null && (
                    <span className="rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
                      wpis gymrata
                    </span>
                  )}
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-white/[.06] bg-black/15 p-5 text-center">
            <p className="text-sm text-slate-500">
              {hasActiveFilters
                ? "Brak produktów spełniających wybrane filtry."
                : "Katalog jest pusty."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
