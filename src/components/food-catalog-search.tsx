"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import type { FoodProduct } from "@/db/schema";
import { DeleteFoodProductButton } from "@/components/delete-food-product-button";
import { toggleFavoriteProductAction } from "@/actions/diet";
import { productLabels } from "@/lib/labels";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

  const visible = useMemo(() => {
    const q = norm(query);
    const list = q.length >= 2 ? products.filter((p) => norm(p.name).includes(q)) : products;
    // ulubione najpierw
    return [...list.filter((p) => favoriteIds.has(p.id)), ...list.filter((p) => !favoriteIds.has(p.id))].slice(0, 80);
  }, [query, products, favoriteIds]);

  const count = products.length;

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
          <b className="text-white">{count.toLocaleString("pl-PL")}</b> produktów
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
                {labels.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-1">
                    {labels.map((l) => (
                      <span key={l.key} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${l.color}`}>
                        {l.pl}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-white/[.06] bg-black/15 p-5 text-center">
            <p className="text-sm text-slate-500">{query ? "Brak produktów pasujących do zapytania." : "Katalog jest pusty."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
