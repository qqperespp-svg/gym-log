"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { FoodProduct } from "@/db/schema";
import { DeleteFoodProductButton } from "@/components/delete-food-product-button";

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
}: {
  products: FoodProduct[];
  userId: number;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = norm(query);
    const list = q.length >= 2 ? products.filter((p) => norm(p.name).includes(q)) : products;
    return list.slice(0, 60);
  }, [query, products]);

  const count = products.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
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
          <b className="text-white">{count.toLocaleString("pl-PL")}</b> produktów w katalogu
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-white/[.06]">
        {visible.length ? (
          <table className="data-table !w-full">
            <thead>
              <tr>
                <th>Produkt</th>
                <th>kcal/100g</th>
                <th>B</th>
                <th>T</th>
                <th>W</th>
                <th>Kod</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className={p.userId === userId ? "bg-lime-400/[.03]" : ""}>
                  <td className="font-bold text-white">
                    {p.name}
                    {p.userId === userId && (
                      <span className="ml-2 rounded-full bg-lime-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-lime-300">
                        Moje
                      </span>
                    )}
                  </td>
                  <td>{p.kcal}</td>
                  <td>{p.protein} g</td>
                  <td>{p.fat} g</td>
                  <td>{p.carbs} g</td>
                  <td className="text-xs text-slate-500">{p.barcode ?? "—"}</td>
                  <td>{p.userId === userId ? <DeleteFoodProductButton id={p.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-5 text-center text-sm text-slate-500">
            {query ? "Brak produktów pasujących do zapytania." : "Katalog jest pusty."}
          </p>
        )}
      </div>
    </div>
  );
}
