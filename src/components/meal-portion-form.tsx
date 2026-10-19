"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { LoaderCircle, ScanLine, Search, UtensilsCrossed, X } from "lucide-react";
import { logMealPortionAction, saveFoundProductAction } from "@/actions/diet";
import { ScanCodeBox } from "@/components/scan-code-box";
import type { FoodProduct } from "@/db/schema";
import { formatMacro, kcalFromMacros, round1 } from "@/lib/diet";
import { suggestMealByHour } from "@/lib/i18n";
import { productLabels } from "@/lib/labels";
import { lookupProductByCode } from "@/lib/product-lookup";
import { matchesWords } from "@/lib/search";

type Item = {
  key: string;
  name: string;
  grams: string;
  protein: number; // /100 g
  fat: number;
  carbs: number;
  kcal: number;
};

function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function MealPortionForm({
  products,
  meals,
  mealNames,
}: {
  products: FoodProduct[];
  meals: number;
  mealNames: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cookedOverride, setCookedOverride] = useState("");
  const [portion, setPortion] = useState("");
  const [meal, setMeal] = useState(() => String(suggestMealByHour()));
  const [note, setNote] = useState("");

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    return products.filter((p) => matchesWords(p.name, query)).slice(0, 12);
  }, [query, products]);

  const sumGrams = items.reduce((s, i) => s + (Number(i.grams) || 0), 0);
  const cookedGrams = Math.max(0, Number(cookedOverride) || sumGrams);
  const portionGrams = Math.max(0, Number(portion) || 0);
  const sums = useMemo(
    () =>
      items.reduce(
        (a, i) => {
          const g = (Number(i.grams) || 0) / 100;
          return {
            protein: a.protein + i.protein * g,
            fat: a.fat + i.fat * g,
            carbs: a.carbs + i.carbs * g,
          };
        },
        { protein: 0, fat: 0, carbs: 0 },
      ),
    [items],
  );
  const factor = cookedGrams > 0 && portionGrams > 0 ? portionGrams / cookedGrams : 0;
  const portionMacros = {
    protein: round1(sums.protein * factor),
    fat: round1(sums.fat * factor),
    carbs: round1(sums.carbs * factor),
  };
  const portionKcal = kcalFromMacros(portionMacros.protein, portionMacros.fat, portionMacros.carbs);
  const totalKcal = kcalFromMacros(round1(sums.protein), round1(sums.fat), round1(sums.carbs));

  function addProduct(name: string, protein: number, fat: number, carbs: number, kcal: number, grams = "100") {
    setItems((cur) => [...cur, { key: newKey(), name, grams, protein, fat, carbs, kcal }]);
    setQuery("");
  }

  async function handleScannedCode(code: string) {
    setScanStatus("Szukam produktu…");
    try {
      const p = await lookupProductByCode(code, products);
      if (!p) {
        setScanStatus(`Nie znaleziono produktu o kodzie ${code}.`);
        return;
      }
      addProduct(p.name, p.protein, p.fat, p.carbs, p.kcal);
      setScanStatus(`Dodano: ${p.name}. Ustaw gramaturę.`);
      const already = products.some((x) => x.barcode === code);
      if (!already) {
        void saveFoundProductAction({
          code,
          name: p.name,
          protein: p.protein,
          fat: p.fat,
          carbs: p.carbs,
          kcal: p.kcal,
        })
          .then(() => router.refresh())
          .catch(() => {});
      }
    } catch {
      setScanStatus("Nie udało się pobrać produktu o tym kodzie.");
    }
  }

  const mealOptions = Array.from({ length: Math.max(1, Math.min(meals, 10)) }, (_, i) => i + 1);
  const mealLabel = (m: number) => mealNames[m - 1] || `Posiłek ${m}`;
  const canSubmit = items.length > 0 && cookedGrams > 0 && portionGrams > 0;

  return (
    <form action={logMealPortionAction} className="space-y-5">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((i) => ({
            name: i.name,
            grams: Number(i.grams) || 0,
            protein: i.protein,
            fat: i.fat,
            carbs: i.carbs,
          })),
        )}
      />
      <input type="hidden" name="cookedGrams" value={String(cookedGrams)} />
      <input type="hidden" name="portionGrams" value={String(portionGrams)} />

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <Search size={12} className="text-lime-400" /> Dodaj produkt po nazwie
          </p>
          <div className="relative">
            <input
              className="input"
              type="text"
              placeholder="np. kurczak, ryż, oliwa…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
              {matches.map((p) => {
                const labels = productLabels(p.protein, p.fat, p.carbs);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p.name, p.protein, p.fat, p.carbs, p.kcal)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/[.03] px-3 py-2 text-left transition hover:bg-lime-400/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-white">{p.name}</span>
                      <span className="flex flex-wrap gap-1">
                        {labels.slice(0, 2).map((l) => (
                          <span key={l.key} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${l.color}`}>
                            {l.pl}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">
                      {p.kcal} kcal · B{p.protein} T{p.fat} W{p.carbs}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <ScanLine size={12} className="text-lime-400" /> Skanuj kod lub wpisz ręcznie
          </p>
          <ScanCodeBox onCode={(code) => void handleScannedCode(code)} onError={() => {}} />
          <div className="mt-2 flex items-center gap-2">
            <input
              className="input min-w-0 flex-1 !py-2 text-sm"
              type="text"
              inputMode="numeric"
              placeholder="albo wpisz kod kreskowy…"
              value={manualCode}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                const c = manualCode.trim();
                if (c) void handleScannedCode(c);
              }}
              className="button-secondary shrink-0 px-3 py-2 text-sm"
            >
              <Search size={14} /> Szukaj
            </button>
          </div>
          {scanStatus && (
            <p className="mt-2 rounded-lg border border-lime-400/15 bg-lime-400/[.06] px-3 py-2 text-xs text-lime-200">
              {scanStatus}
            </p>
          )}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Składniki</p>
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 rounded-lg border border-white/[.06] bg-black/15 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{item.name}</span>
              <input
                type="number"
                min="0"
                step="1"
                className="input !min-h-9 !w-20 !px-2 !py-1 text-center"
                value={item.grams}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setItems((cur) => cur.map((it) => (it.key === item.key ? { ...it, grams: e.target.value } : it)))
                }
              />
              <span className="text-[11px] text-slate-500">g</span>
              <button
                type="button"
                onClick={() => setItems((cur) => cur.filter((it) => it.key !== item.key))}
                className="text-slate-500 hover:text-rose-300"
                aria-label="Usuń składnik"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <p className="text-xs text-slate-400">
            Suma składników: <b className="text-white">{Math.round(sumGrams).toLocaleString("pl-PL")} g</b> ·{" "}
            <b className="text-lime-300">{totalKcal.toLocaleString("pl-PL")} kcal</b> · B {formatMacro(round1(sums.protein))} g
            · T {formatMacro(round1(sums.fat))} g · W {formatMacro(round1(sums.carbs))} g
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[.02] px-4 py-6 text-center text-sm text-slate-500">
          Dodaj produkty z katalogu albo zeskanuj kod — potem wyznaczysz porcję z całości.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field-label">
          Masa całości (g)
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            placeholder={sumGrams ? String(Math.round(sumGrams)) : "suma składników"}
            value={cookedOverride}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setCookedOverride(e.target.value)}
          />
          <span className="text-[10px] font-medium text-slate-600">
            Domyślnie suma składników. Zmień, jeśli po ugotowaniu masa jest inna.
          </span>
        </label>
        <label className="field-label">
          Porcja, którą zjadłeś (g)
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            placeholder="np. 300"
            value={portion}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setPortion(e.target.value)}
            required
          />
        </label>
        <label className="field-label">
          Data
          <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" required />
        </label>
        <label className="field-label">
          Posiłek
          <span className="select-shell !min-h-12">
            <select name="meal" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {mealOptions.map((m) => (
                <option key={m} value={m}>
                  {m}. {mealLabel(m)}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      {cookedGrams > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "½ całości", n: cookedGrams / 2 },
            { label: "⅓ całości", n: cookedGrams / 3 },
            { label: "¼ całości", n: cookedGrams / 4 },
            { label: "całość", n: cookedGrams },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => setPortion(String(Math.round(b.n)))}
              className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[11px] font-bold text-slate-300 hover:border-lime-400/30 hover:text-lime-300"
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      <label className="field-label">
        Notatka (opcjonalnie)
        <input
          className="input"
          name="note"
          type="text"
          maxLength={200}
          placeholder="zostaw puste — wpisze się skład i gramatura porcji"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="flex items-end justify-between gap-4 rounded-2xl border border-lime-400/15 bg-lime-400/[.06] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-lime-400/70">
            Porcja {portionGrams > 0 ? `${Math.round(portionGrams).toLocaleString("pl-PL")} g` : "—"}
            {cookedGrams > 0 ? ` z ${Math.round(cookedGrams).toLocaleString("pl-PL")} g` : ""}
          </p>
          <p className="mt-0.5 text-sm text-slate-300">
            <b className="text-lime-300">{portionKcal.toLocaleString("pl-PL")} kcal</b> · B {formatMacro(portionMacros.protein)} g
            · T {formatMacro(portionMacros.fat)} g · W {formatMacro(portionMacros.carbs)} g
          </p>
        </div>
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button-primary shrink-0" disabled={pending || disabled} aria-disabled={pending || disabled}>
      {pending ? (
        <>
          <LoaderCircle size={17} className="animate-spin" /> Zapisuję…
        </>
      ) : (
        <>
          <UtensilsCrossed size={17} /> Dodaj porcję
        </>
      )}
    </button>
  );
}
