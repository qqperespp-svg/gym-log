"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/** Kompresuje klatkę/zdjęcie do ~900 px JPEG — mieści się w limicie API. */
function compressImageData(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 900;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function MealEstimate({ meals, mealNames }: { meals: number; mealNames: string[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [meal, setMeal] = useState("1");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState<string | null>(null);

  // Aparat (podgląd na żywo — niezależne od tego, czy przeglądarka respektuje capture).
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cam, setCam] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function startCam() {
    setCamError(null);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("", "NotFoundError");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCam(true);
      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (v) {
          v.muted = true;
          v.autoplay = true;
          v.playsInline = true;
          v.setAttribute("playsinline", "");
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      });
    } catch {
      setCamError("Nie udało się uruchomić aparatu — użyj galerii.");
      setCam(false);
    }
  }

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCam(false);
  }

  async function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCam();
    setPhoto(dataUrl.slice(0, 60) + "…");
    await sendEstimate(dataUrl);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setPhoto(dataUrl.slice(0, 60) + "…");
      await sendEstimate(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function sendEstimate(dataUrl: string) {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const data = await compressImageData(dataUrl);
      const mime = "image/jpeg";
      const fd = new FormData();
      fd.set("image", new File([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], "meal.jpg", { type: mime }));
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
        <button type="button" onClick={startCam} disabled={loading} className="button-primary">
          <Camera size={16} /> Zrób zdjęcie posiłku
        </button>
        <label className="button-secondary cursor-pointer">
          <ImageUp size={16} /> Wgraj z galerii
          <input type="file" accept="image/*" className="hidden" disabled={loading} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        <span className="text-xs text-slate-500">AI (Google Gemini) rozpozna składniki i makro.</span>
      </div>

      {/* Podgląd aparatu — wideo zawsze w DOM, żeby ref istniał przed startem */}
      <div className={`relative overflow-hidden rounded-2xl border border-lime-400/25 bg-black/40 ${cam ? "block" : "hidden"}`}>
        <video ref={videoRef} playsInline muted autoPlay className="mx-auto aspect-video max-h-72 w-full object-contain" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-16 -translate-y-1/2 border-y-2 border-lime-400/80" />
        <p className="absolute inset-x-0 bottom-2 text-center text-xs font-bold text-lime-300">Ustaw posiłek w kadrze</p>
      </div>
      {cam && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void capture()} disabled={loading} className="button-primary">
            <Sparkles size={16} /> Zrób zdjęcie i oceń
          </button>
          <button type="button" onClick={stopCam} className="button-secondary">
            <X size={16} /> Anuluj
          </button>
        </div>
      )}
      {camError && <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{camError}</p>}

      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <LoaderCircle size={16} className="animate-spin text-lime-400" /> AI analizuje zdjęcie…
        </p>
      )}
      {photo && !loading && !cam && (
        <p className="flex items-center gap-2 text-[11px] text-slate-500">
          <Camera size={13} /> Zdjęcie: {photo}
          <button type="button" onClick={() => { setPhoto(null); setItems([]); }} className="text-rose-300">
            <X size={13} />
          </button>
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
