"use client";

import { useMemo, useState } from "react";
import { Camera, ImageUp, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { logMealEstimateAction } from "@/actions/diet";
import { formatMacro, kcalFromMacros, round1 } from "@/lib/diet";

type EstimateItem = {
  name: string;
  grams: number;
  protein: number; // na 100 g
  fat: number;
  carbs: number;
  kcal: number;
};

/** Kompresuje zdjęcie do ~800 px JPEG — mieści się w limicie API. */
function compressImage(file: File): Promise<{ mime: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ mime: "image/jpeg", data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1] });
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MealEstimate({ meals, mealNames }: { meals: number; mealNames: string[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [meal, setMeal] = useState("1");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const { mime, data } = await compressImage(file);
      setPhoto(`data:${mime};base64,${data.slice(0, 60)}…`);
      const fd = new FormData();
      fd.set("image", new File([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], "meal.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/estimate", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Nie udało się oszacować posiłku.");
        return;
      }
      setItems(Array.isArray(body.items) ? body.items : []);
      if (!body.items?.length) setError("Nie wykryto jedzenia na zdjęciu.");
    } catch {
      setError("Nie udało się przetworzyć zdjęcia.");
    } finally {
      setLoading(false);
    }
  }

  const total = useMemo(
    () =>
      items.reduce(
        (a, it) => {
          const g = Math.max(0, Number(it.grams) || 0) / 100;
          const p = round1((Number(it.protein) || 0) * g);
          const f = round1((Number(it.fat) || 0) * g);
          const c = round1((Number(it.carbs) || 0) * g);
          return { protein: a.protein + p, fat: a.fat + f, carbs: a.carbs + c, kcal: a.kcal + kcalFromMacros(p, f, c) };
        },
        { protein: 0, fat: 0, carbs: 0, kcal: 0 },
      ),
    [items],
  );

  const mealOptions = Array.from({ length: Math.max(1, Math.min(meals, 10)) }, (_, i) => i + 1);
  const mealLabel = (m: number) => mealNames[m - 1] || `Posiłek ${m}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="button-primary cursor-pointer">
          <Camera size={16} /> Zrób zdjęcie posiłku
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={loading}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="button-secondary cursor-pointer">
          <ImageUp size={16} /> Wgraj z galerii
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={loading}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <span className="text-xs text-slate-500">AI (Google Gemini) rozpozna składniki i makro.</span>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <LoaderCircle size={16} className="animate-spin text-lime-400" /> AI analizuje zdjęcie…
        </p>
      )}
      {photo && !loading && (
        <p className="flex items-center gap-2 text-[11px] text-slate-500">
          <Camera size={13} /> Zdjęcie: {photo} <button type="button" onClick={() => { setPhoto(null); setItems([]); }} className="text-rose-300"><X size={13} /></button>
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{error}</p>
      )}

      {items.length > 0 && (
        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[.05] p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-lime-400">
            Wykryte składniki — popraw gramaturę i dodaj
          </p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[.06] bg-black/15 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{it.name}</span>
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
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Razem: <b className="text-lime-300">{total.kcal.toLocaleString("pl-PL")} kcal</b> · B{" "}
            {formatMacro(total.protein)} g · T {formatMacro(total.fat)} g · W {formatMacro(total.carbs)} g
          </p>

          <form action={logMealEstimateAction} className="mt-4 grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="items" value={JSON.stringify(items)} />
            <label className="field-label">
              Data
              <input className="input" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field-label">
              Posiłek
              <select className="input" name="meal" value={meal} onChange={(e) => setMeal(e.target.value)}>
                {mealOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}. {mealLabel(m)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" className="button-primary w-full justify-center">
                <Plus size={17} /> Dodaj do dziennika
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
