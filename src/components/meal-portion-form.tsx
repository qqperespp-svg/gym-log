"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bookmark, LoaderCircle, ScanLine, Search, UtensilsCrossed, X } from "lucide-react";
import { addRecipeAction, logMealPortionAction, saveFoundProductAction, updateRecipeAction } from "@/actions/diet";
import { ScanCodeBox } from "@/components/scan-code-box";
import type { FoodProduct, Recipe } from "@/db/schema";
import { formatMacroCompact, formatMacroTriplet, kcalFromMacros, round1 } from "@/lib/diet";
import { suggestMealByHour } from "@/lib/i18n";
import { productLabels } from "@/lib/labels";
import { lookupProductByCode } from "@/lib/product-lookup";
import { matchesWords } from "@/lib/search";

const DRAFT_KEY = "gymrat:meal-mix-draft";

type Item = {
  key: string;
  productId?: number;
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

function itemsFromRecipe(recipe: Recipe): Item[] {
  try {
    const parsed = JSON.parse(recipe.items ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row: Partial<Item>, i: number) => ({
      key: newKey() + i,
      productId: Number(row.productId) || undefined,
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

export function MealPortionForm({
  products,
  meals,
  mealNames,
  recipes = [],
}: {
  products: FoodProduct[];
  meals: number;
  mealNames: string[];
  recipes?: Recipe[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cookedOverride, setCookedOverride] = useState("");
  const [portion, setPortion] = useState("");
  const [meal, setMeal] = useState(() => String(suggestMealByHour()));
  const [note, setNote] = useState("");
  const [mixName, setMixName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          items?: Item[];
          cookedOverride?: string;
          portion?: string;
          meal?: string;
          note?: string;
          step?: 1 | 2;
          mixName?: string;
          editingId?: number | null;
        };
        if (Array.isArray(draft.items) && draft.items.length) setItems(draft.items);
        if (typeof draft.cookedOverride === "string") setCookedOverride(draft.cookedOverride);
        if (typeof draft.portion === "string") setPortion(draft.portion);
        if (typeof draft.meal === "string" && draft.meal) setMeal(draft.meal);
        if (typeof draft.note === "string") setNote(draft.note);
        if (draft.step === 1 || draft.step === 2) setStep(draft.step);
        if (typeof draft.mixName === "string") setMixName(draft.mixName);
        if (typeof draft.editingId === "number" || draft.editingId === null) setEditingId(draft.editingId ?? null);
      }
    } catch {
      // ignoruj uszkodzony szkic
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ items, cookedOverride, portion, meal, note, step, mixName, editingId }),
        );
      } catch {
        // brak miejsca / tryb prywatny
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [hydrated, items, cookedOverride, portion, meal, note, step, mixName, editingId]);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    return products.filter((p) => matchesWords(p.name, query)).slice(0, 12);
  }, [query, products]);

  const serializedItems = items.map((i) => ({
    productId: i.productId ?? 0,
    name: i.name,
    grams: Number(i.grams) || 0,
    protein: i.protein,
    fat: i.fat,
    carbs: i.carbs,
    kcal: i.kcal,
  }));

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

  function addProduct(name: string, protein: number, fat: number, carbs: number, kcal: number, productId?: number) {
    setItems((cur) => [...cur, { key: newKey(), productId, name, grams: "", protein, fat, carbs, kcal }]);
    setQuery("");
  }

  function loadMix(recipe: Recipe) {
    setItems(itemsFromRecipe(recipe));
    setMixName(recipe.name);
    setEditingId(recipe.id);
    setCookedOverride("");
    setPortion("");
    setStep(1);
    setScanStatus(`Wczytano mieszankę: ${recipe.name}. Możesz zmienić gramy składników.`);
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
      setScanStatus(`Dodano: ${p.name}. Uzupełnij gramy w mieszance.`);
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
  const mixReady = items.length > 0 && items.every((i) => (Number(i.grams) || 0) > 0);
  const canSubmit = mixReady && cookedGrams > 0 && portionGrams > 0;
  const canSaveMix = mixReady && mixName.trim().length >= 2;

  return (
    <form
      action={logMealPortionAction}
      className="space-y-5"
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.name === "intent" && submitter.value === "save-mix") return;
        if (step !== 2 || !canSubmit) {
          e.preventDefault();
          return;
        }
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignoruj
        }
      }}
    >
      <input type="hidden" name="items" value={JSON.stringify(serializedItems)} />
      <input type="hidden" name="cookedGrams" value={String(cookedGrams)} />
      <input type="hidden" name="portionGrams" value={String(portionGrams)} />
      <input type="hidden" name="tab" value="liczenie" />
      {editingId != null && <input type="hidden" name="recipeId" value={editingId} />}

      <ol className="grid grid-cols-2 gap-2">
        <li>
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
              step === 1
                ? "border-lime-400/30 bg-lime-400/[.08]"
                : "border-white/[.06] bg-white/[.02] hover:bg-white/[.04]"
            }`}
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                step === 1 ? "bg-lime-400 text-black" : "bg-white/10 text-slate-400"
              }`}
            >
              1
            </span>
            <span>
              <b className="block text-sm font-extrabold text-white">Skład mieszanki</b>
              <span className="block text-[11px] text-slate-500">Dodaj produkty, bez porcji</span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => mixReady && setStep(2)}
            disabled={!mixReady}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
              step === 2
                ? "border-lime-400/30 bg-lime-400/[.08]"
                : "border-white/[.06] bg-white/[.02] hover:bg-white/[.04]"
            }`}
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                step === 2 ? "bg-lime-400 text-black" : "bg-white/10 text-slate-400"
              }`}
            >
              2
            </span>
            <span>
              <b className="block text-sm font-extrabold text-white">Ile zjadłeś</b>
              <span className="block text-[11px] text-slate-500">Gramy z całej mieszanki</span>
            </span>
          </button>
        </li>
      </ol>

      {step === 1 ? (
        <>
          {recipes.length > 0 && (
            <div className="rounded-xl border border-white/[.06] bg-black/15 p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Zapisane mieszanki</p>
              <div className="flex flex-wrap gap-2">
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => loadMix(recipe)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                      editingId === recipe.id
                        ? "border-lime-400/40 bg-lime-400/15 text-lime-200"
                        : "border-white/10 bg-white/[.04] text-slate-300 hover:border-lime-400/30 hover:text-lime-300"
                    }`}
                  >
                    {recipe.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                        onClick={() => addProduct(p.name, p.protein, p.fat, p.carbs, p.kcal, p.id)}
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
                          {kcalFromMacros(p.protein, p.fat, p.carbs)} kcal · {formatMacroCompact(p.protein, p.fat, p.carbs)}
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
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Składniki mieszanki · ile weszło do całości
              </p>
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-2 rounded-lg border border-white/[.06] bg-black/15 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{item.name}</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input !min-h-9 !w-20 !px-2 !py-1 text-center"
                    placeholder="0"
                    value={item.grams}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setItems((cur) => cur.map((it) => (it.key === item.key ? { ...it, grams: e.target.value } : it)))
                    }
                    aria-label={`Gramy ${item.name} w mieszance`}
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
                Cała mieszanka: <b className="text-white">{Math.round(sumGrams).toLocaleString("pl-PL")} g</b> ·{" "}
                <b className="text-lime-300">{totalKcal.toLocaleString("pl-PL")} kcal</b> ·{" "}
                {formatMacroTriplet(round1(sums.protein), round1(sums.fat), round1(sums.carbs))}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[.02] px-4 py-6 text-center text-sm text-slate-500">
              Najpierw zbierz składniki. Gramy przy produkcie to ile weszło do mieszanki — porcję zjesz w następnym kroku.
              Szkic zostaje po przełączeniu karty.
            </p>
          )}

          <div className="grid gap-3 rounded-xl border border-white/[.06] bg-black/15 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="field-label">
              Nazwa mieszanki
              <input
                className="input"
                name="name"
                type="text"
                minLength={2}
                maxLength={160}
                placeholder="np. Danie z garnka — kurczak z ryżem"
                value={mixName}
                onChange={(e) => setMixName(e.target.value)}
              />
            </label>
            <button
              type="submit"
              name="intent"
              value="save-mix"
              className="button-secondary justify-center"
              disabled={!canSaveMix}
              formAction={editingId != null ? updateRecipeAction : addRecipeAction}
            >
              <Bookmark size={16} /> {editingId != null ? "Zapisz zmiany mieszanki" : "Zapamiętaj mieszankę"}
            </button>
          </div>

          <div className="flex justify-end">
            <button type="button" className="button-primary" disabled={!mixReady} onClick={() => mixReady && setStep(2)}>
              Dalej — ile zjadłem <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-white/[.06] bg-black/15 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {mixName.trim() || "Gotowa mieszanka"}
              </p>
              <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-lime-300 hover:text-white">
                Edytuj skład
              </button>
            </div>
            <ul className="space-y-1 text-sm text-slate-300">
              {items.map((item) => (
                <li key={item.key} className="flex justify-between gap-3">
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 font-bold text-white">{Math.round(Number(item.grams) || 0)} g</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Suma składników: <b className="text-white">{Math.round(sumGrams).toLocaleString("pl-PL")} g</b> ·{" "}
              <b className="text-lime-300">{totalKcal.toLocaleString("pl-PL")} kcal</b>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">
              Masa całej mieszanki (g)
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
              Ile zjadłeś z mieszanki (g)
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
          </div>

          {cookedGrams > 0 && (
            <div className="flex flex-wrap gap-2">
              {[
                { label: "½ mieszanki", n: cookedGrams / 2 },
                { label: "⅓ mieszanki", n: cookedGrams / 3 },
                { label: "¼ mieszanki", n: cookedGrams / 4 },
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

          <div className="grid gap-4 sm:grid-cols-2">
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
                {cookedGrams > 0 ? ` z ${Math.round(cookedGrams).toLocaleString("pl-PL")} g mieszanki` : ""}
              </p>
              <p className="mt-0.5 text-sm text-slate-300">
                <b className="text-lime-300">{portionKcal.toLocaleString("pl-PL")} kcal</b> ·{" "}
                {formatMacroTriplet(portionMacros.protein, portionMacros.fat, portionMacros.carbs)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" className="button-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Wstecz
              </button>
              <SubmitButton disabled={!canSubmit} />
            </div>
          </div>
        </>
      )}
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
