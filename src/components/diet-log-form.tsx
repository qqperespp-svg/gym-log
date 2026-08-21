"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Beef, Croissant, Droplets, Plus, ScanLine, Search, Star, X } from "lucide-react";
import { logDietEntryAction, saveFoundProductAction } from "@/actions/diet";
import { formatMacro, kcalFromMacros, round1 } from "@/lib/diet";
import { suggestMealByHour } from "@/lib/i18n";
import { enqueue } from "@/lib/offline-queue";
import { productLabels } from "@/lib/labels";
import { matchesWords } from "@/lib/search";
import { lookupProductByCode } from "@/lib/product-lookup";
import { ScanCodeBox } from "@/components/scan-code-box";
import type { FoodProduct } from "@/db/schema";

export function DietLogForm({
  products,
  meals,
  mealNames,
  favoriteIds,
}: {
  products: FoodProduct[];
  meals: number;
  mealNames: string[];
  favoriteIds?: Set<number>;
}) {
  const [proteinPer100, setProteinPer100] = useState("");
  const [fatPer100, setFatPer100] = useState("");
  const [carbsPer100, setCarbsPer100] = useState("");
  const [grams, setGrams] = useState("100");
  const [note, setNote] = useState("");
  const [meal, setMeal] = useState(() => String(suggestMealByHour()));
  const [query, setQuery] = useState("");
  const [offlineNote, setOfflineNote] = useState<string | null>(null);
  const router = useRouter();
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    const onSynced = () => setOfflineNote("Zsynchronizowano wpisy offline. ✅");
    window.addEventListener("gymrat:synced", onSynced);
    return () => window.removeEventListener("gymrat:synced", onSynced);
  }, []);

  const g = Math.max(0, Number(grams) || 0);
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

  const favorites = useMemo(
    () => (favoriteIds ? products.filter((p) => favoriteIds.has(p.id)) : []),
    [products, favoriteIds],
  );
  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    return products.filter((p) => matchesWords(p.name, query)).slice(0, 8);
  }, [query, products]);

  function fill(p: FoodProduct, gramsValue = "100") {
    setProteinPer100(String(p.protein));
    setFatPer100(String(p.fat));
    setCarbsPer100(String(p.carbs));
    setGrams(gramsValue);
    setNote(p.barcode ? `${p.name} (${p.barcode})` : p.name);
    setQuery("");
  }

  /** Po zeskanowaniu kodu szuka produktu (lokalny katalog → Open Food Facts) i wypełnia formularz. */
  async function handleScannedCode(code: string) {
    setScanStatus("Szukam produktu…");
    try {
      const p = await lookupProductByCode(code, products);
      if (!p) {
        setScanStatus(`Nie znaleziono produktu o kodzie ${code} — wpisz makra ręcznie albo dodaj go do katalogu.`);
        return;
      }
      setProteinPer100(String(p.protein));
      setFatPer100(String(p.fat));
      setCarbsPer100(String(p.carbs));
      setGrams("100");
      setNote(`${p.name} (kod ${code})`);
      setScanStatus(`Znaleziono: ${p.name} — uzupełnij gramaturę i dodaj do dziennika. ✅`);
      // Zapis do katalogu (cicho), tylko gdy produktu jeszcze nie ma — inaczej
      // duplikowalibyśmy pozycje we wspólnym katalogu.
      const alreadyInCatalog = products.some((x) => x.barcode === code);
      if (!alreadyInCatalog) {
        void saveFoundProductAction({ code, name: p.name, protein: p.protein, fat: p.fat, carbs: p.carbs, kcal: p.kcal })
          .then(() => router.refresh())
          .catch(() => {});
      }
    } catch {
      setScanStatus("Nie udało się pobrać produktu o tym kodzie.");
    }
  }

  async function submit(formData: FormData) {
    if (!navigator.onLine) {
      await enqueue({
        kind: "diet",
        date: String(formData.get("date") ?? new Date().toISOString().slice(0, 10)),
        protein: computed.protein,
        fat: computed.fat,
        carbs: computed.carbs,
        kcal,
        mealNumber: Number(formData.get("meal")) || null,
        note: String(formData.get("note") ?? "") || null,
      });
      setOfflineNote("Brak internetu — wpis zapisany lokalnie, zsynchronizuje się później. 📶");
      return;
    }
    await logDietEntryAction(formData);
  }

  const mealOptions = Array.from({ length: Math.max(1, Math.min(meals, 10)) }, (_, i) => i + 1);
  const mealLabel = (m: number) => mealNames[m - 1] || `Posiłek ${m}`;

  return (
    <form action={submit} className="space-y-4">
      {favorites.length > 0 && (
        <div className="rounded-xl border border-amber-400/15 bg-amber-400/[.05] p-3">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-300/80">
            <Star size={12} /> Ulubione — dodaj jednym kliknięciem
          </p>
          <div className="flex flex-wrap gap-2">
            {favorites.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => fill(p, "100")}
                className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20"
              >
                {p.name.slice(0, 24)} · {p.kcal} kcal
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <Search size={12} className="text-lime-400" /> Znajdź produkt po nazwie
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
              {matches.map((p) => {
                const labels = productLabels(p.protein, p.fat, p.carbs);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => fill(p)}
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
                        {p.userId !== null && (
                          <span className="rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
                            wpis gymrata
                          </span>
                        )}
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

          {/* Ręczne wpisanie kodu kreskowego */}
          <div className="mt-2 flex items-center gap-2">
            <input
              className="input min-w-0 flex-1 !py-2 text-sm"
              type="text"
              inputMode="numeric"
              placeholder="albo wpisz kod kreskowy…"
              value={manualCode}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setManualCode(event.target.value)}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field-label">
          Data
          <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" required />
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
            <ScaleIcon />
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

      <div className="flex items-end justify-between gap-4 rounded-2xl border border-lime-400/15 bg-lime-400/[.06] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-lime-400/70">
            Wpis na {Math.round(g).toLocaleString("pl-PL")} g
          </p>
          <p className="mt-0.5 text-sm text-slate-300">
            <b className="text-lime-300">{kcal.toLocaleString("pl-PL")} kcal</b> · B {formatMacro(computed.protein)} g · T {formatMacro(computed.fat)} g · W {formatMacro(computed.carbs)} g
          </p>
          {offlineNote && <p className="mt-1 text-xs text-sky-300">{offlineNote}</p>}
        </div>
        <button type="submit" className="button-primary shrink-0">
          <Plus size={17} /> Dodaj
        </button>
      </div>

      <input type="hidden" name="protein" value={computed.protein} />
      <input type="hidden" name="fat" value={computed.fat} />
      <input type="hidden" name="carbs" value={computed.carbs} />
    </form>
  );
}

function ScaleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}
