"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, Camera, ImagePlus, LoaderCircle, ScanLine, Search, X } from "lucide-react";
import { logScannedEntryAction } from "@/actions/diet";

type Product = {
  code: string;
  name: string;
  protein: number; // na 100 g
  fat: number;
  carbs: number;
  kcal: number;
};

type ZXingReader = {
  decodeFromStream(
    stream: MediaStream,
    video: HTMLVideoElement,
    callback: (result: { getText(): string } | null) => void,
  ): unknown;
  decodeFromImageUrl(url: string): Promise<{ getText(): string } | null>;
  reset(): void;
};

type ZXingGlobal = { BrowserMultiFormatReader: new () => ZXingReader };

/**
 * Ładuje silnik skanowania kodów kreskowych (ZXing) z pliku wbudowanego
 * w aplikację (public/vendor/zxing.min.js). Dzięki temu żadna zależność
 * npm nie jest potrzebna — wystarczy wgrać src + public na GitHub.
 */
function loadZxing(): Promise<ZXingGlobal> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { ZXing?: ZXingGlobal };
    if (w.ZXing) {
      resolve(w.ZXing);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-zxing="1"]');
    if (existing) {
      const done = () => (w.ZXing ? resolve(w.ZXing) : reject(new Error("load-failed")));
      const fail = () => reject(new Error("load-failed"));
      existing.addEventListener("load", done);
      existing.addEventListener("error", fail);
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/zxing.min.js";
    script.dataset.zxing = "1";
    script.onload = () =>
      w.ZXing ? resolve(w.ZXing) : reject(new Error("Nie udało się załadować skanera"));
    script.onerror = () => reject(new Error("Nie udało się załadować skanera (sprawdź połączenie)"));
    document.head.appendChild(script);
  });
}

function round1(n: number | undefined): number {
  return Number.isFinite(n) ? Math.round((n ?? 0) * 10) / 10 : 0;
}

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<ZXingReader | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [grams, setGrams] = useState("100");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch {
          // ignoruj
        }
      }
    };
  }, []);

  async function stopCamera() {
    setScanning(false);
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        // ignoruj
      }
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function lookup(code: string) {
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setProduct(null);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`,
      );
      if (!res.ok) throw new Error("Nie udało się pobrać produktu");
      const data = await res.json();
      if (data?.status !== 1 || !data.product) {
        throw new Error("Nie znaleziono produktu o tym kodzie.");
      }
      const n = data.product.nutriments ?? {};
      const kcal =
        n["energy-kcal_100g"] ??
        (n["energy-kj_100g"] != null ? Math.round((n["energy-kj_100g"] / 4.184) * 10) / 10 : 0);
      // Uwaga: Open Food Facts używa kluczy w liczbie mnogiej (proteins_100g,
      // carbohydrates_100g) — obsługujemy też warianty pojedyncze jako fallback.
      setProduct({
        code: clean,
        name:
          data.product.product_name ||
          data.product.generic_name ||
          data.product.brands ||
          `Produkt (${clean})`,
        protein: round1(n.proteins_100g ?? n.protein_100g),
        fat: round1(n.fat_100g ?? n.fats_100g),
        carbs: round1(n.carbohydrates_100g ?? n.carbs_100g),
        kcal: Math.round(Number(kcal) || 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się pobrać produktu");
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setError(null);
    setProduct(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("no-camera");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        // Poczekaj, aż wideo będzie miało realne klatki (rozmiar) — inaczej
        // ZXing nie wykryje żadnego kadru i skanowanie cicho nie zadziała.
        if (video.videoWidth === 0) {
          await new Promise<void>((resolve) => {
            const done = () => {
              video.removeEventListener("loadedmetadata", done);
              resolve();
            };
            video.addEventListener("loadedmetadata", done);
            // bezpiecznik na wypadek braku eventu
            setTimeout(resolve, 3000);
          });
        }
      }
      const { BrowserMultiFormatReader } = await loadZxing();
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setScanning(true);
      reader.decodeFromStream(stream, video!, (result) => {
        if (result) {
          const code = result.getText().trim();
          void stopCamera().then(() => lookup(code));
        }
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      const hint =
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Brak zgody na aparat — odblokuj kamerę dla tej strony w ustawieniach przeglądarki."
          : name === "NotFoundError"
            ? "Nie znaleziono aparatu na tym urządzeniu."
            : "Nie udało się uruchomić aparatu — użyj „Wgraj zdjęcie kodu” albo wpisz kod ręcznie.";
      setError(hint);
      setScanning(false);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { BrowserMultiFormatReader } = await loadZxing();
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      let result: { getText(): string } | null = null;
      try {
        result = await reader.decodeFromImageUrl(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (result) {
        await lookup(result.getText().trim());
      } else {
        setError("Nie rozpoznano kodu na zdjęciu.");
      }
    } catch {
      setError("Nie rozpoznano kodu na zdjęciu.");
    } finally {
      setLoading(false);
    }
  }

  const g = Math.max(0, Number(grams) || 0);
  const computed = product
    ? {
        protein: Math.round(product.protein * (g / 100)),
        fat: Math.round(product.fat * (g / 100)),
        carbs: Math.round(product.carbs * (g / 100)),
        kcal: Math.round(product.kcal * (g / 100)),
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={scanning ? stopCamera : startCamera}
          disabled={loading}
          className={`${scanning ? "button-secondary" : "button-primary"} px-4 py-2.5 text-sm`}
        >
          {scanning ? (
            <>
              <X size={16} /> Zatrzymaj skanowanie
            </>
          ) : (
            <>
              <ScanLine size={16} /> Skanuj kod kreskowy
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="button-secondary px-4 py-2.5 text-sm"
        >
          <ImagePlus size={16} /> Wgraj zdjęcie kodu
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
        <span className="inline-flex items-center gap-2 rounded-full bg-white/[.04] px-3 py-1.5 text-xs text-slate-400 ring-1 ring-white/10">
          <Barcode size={14} /> albo wpisz kod:
        </span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="np. 3017620422003"
          className="input w-44"
          value={manualCode}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setManualCode(event.target.value)}
        />
        <button
          type="button"
          onClick={() => lookup(manualCode)}
          disabled={loading}
          className="button-secondary px-4 py-2.5 text-sm"
        >
          <Search size={16} /> Szukaj
        </button>
      </div>

      {scanning && (
        <div className="relative overflow-hidden rounded-2xl border border-lime-400/25 bg-black/40">
          <video
            ref={videoRef}
            playsInline
            muted
            className="mx-auto aspect-video max-h-72 w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-16 -translate-y-1/2 border-y-2 border-lime-400/80" />
          <p className="absolute inset-x-0 bottom-2 text-center text-xs font-bold text-lime-300">
            Skieruj aparat na kod kreskowy
          </p>
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <LoaderCircle size={16} className="animate-spin text-lime-400" /> Szukam produktu…
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {product && computed && (
        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[.06] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-lime-400/70">
                Znaleziony produkt · kod {product.code}
              </p>
              <h3 className="mt-0.5 font-extrabold text-white">{product.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                Na 100 g: {product.kcal} kcal · B {product.protein} g · T {product.fat} g · W{" "}
                {product.carbs} g
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProduct(null)}
              className="icon-button"
              aria-label="Odrzuć produkt"
            >
              <X size={16} />
            </button>
          </div>

          <form action={logScannedEntryAction} className="mt-4 grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="protein" value={computed.protein} />
            <input type="hidden" name="fat" value={computed.fat} />
            <input type="hidden" name="carbs" value={computed.carbs} />
            <input type="hidden" name="note" value={`${product.name} (skan ${product.code})`} />
            <label className="field-label">
              Ilość (g)
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={grams}
                onFocus={(event) => event.target.select()}
                onChange={(event) => setGrams(event.target.value)}
              />
            </label>
            <label className="field-label">
              Data
              <input
                className="input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <div className="flex items-end rounded-xl bg-black/20 px-4 py-2.5 sm:col-span-2">
              <p className="text-sm text-slate-300">
                Wpis: <b className="text-lime-300">{computed.kcal} kcal</b> · B{" "}
                {computed.protein} g · T {computed.fat} g · W {computed.carbs} g
              </p>
            </div>
            <div className="sm:col-span-4">
              <button type="submit" className="button-primary">
                <Camera size={17} /> Dodaj do dziennika
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
