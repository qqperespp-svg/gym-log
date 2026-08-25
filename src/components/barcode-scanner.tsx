"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, Camera, ImagePlus, LoaderCircle, QrCode, ScanLine, Search, X } from "lucide-react";
import { logScannedEntryAction } from "@/actions/diet";
import { formatMacro, round1 } from "@/lib/diet";
import type { FoodProduct } from "@/db/schema";

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

/** Ładuje silnik ZXing z pliku wbudowanego w aplikację (public/vendor/zxing.min.js). */
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

function round1Raw(n: number | undefined): number {
  return Number.isFinite(n) ? Math.round((n ?? 0) * 10) / 10 : 0;
}

/** Czeka, aż wideo ma realne klatki (rozmiar > 0) — bez tego ZXing nie ma czego dekodować. */
function waitForVideoFrames(video: HTMLVideoElement, timeout = 7000): Promise<void> {
  return new Promise((resolve) => {
    if (video.videoWidth > 0 && video.readyState >= 2) {
      resolve();
      return;
    }
    const start = Date.now();
    const iv = setInterval(() => {
      if ((video.videoWidth > 0 && video.readyState >= 2) || Date.now() - start > timeout) {
        clearInterval(iv);
        resolve();
      }
    }, 150);
  });
}

/**
 * Wyciąga kod produktu z treści kodu QR. Kody QR na produktach rzadko zawierają
 * sam numer — zwykle to URL (GS1 Digital Link, Open Food Facts itp.).
 */
function extractCodeFromQR(text: string): string | null {
  /** GTIN-14 z wiodącym zerem (wskaźnik opakowania 0) = ten sam produkt co EAN-13. */
  const normalize = (c: string): string =>
    c.length === 14 && c.startsWith("0") ? c.slice(1) : c;

  const t = text.trim();
  if (/^\d{8,14}$/.test(t)) return normalize(t); // czysty numer (EAN-8/12/13, GTIN-14)
  // GS1 Digital Link: https://id.gs1.org/01/05901234567890...
  const gs1 = t.match(/\/01\/(\d{12,14})/);
  if (gs1) return normalize(gs1[1]);
  // Open Food Facts / inne: .../product/5902409703887
  const off = t.match(/\/product\/(\d{8,14})/);
  if (off) return normalize(off[1]);
  // Dowolny ciąg cyfr 8–14 w tekście (np. „EAN: 5902409703887").
  const any = t.match(/\d{13,14}|\d{12}|\d{8}/);
  if (any) return normalize(any[0]);
  return null;
}

export function BarcodeScanner({
  products,
  meals,
  mealNames,
  autoScan,
}: {
  products: FoodProduct[];
  meals: number;
  mealNames: string[];
  autoScan?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<ZXingReader | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"barcode" | "qr">("barcode");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [grams, setGrams] = useState("100");
  const [meal, setMeal] = useState("1");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoScan && !scanning) {
      void startCamera("barcode");
    }
  }, [autoScan]);

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
    setCameraError(null);
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
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.removeAttribute("src");
    }
  }

  function cameraHint(e: unknown): string {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Brak zgody na aparat — odblokuj kamerę dla tej strony w ustawieniach przeglądarki / aplikacji.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "Nie znaleziono aparatu na tym urządzeniu.";
    }
    return "Nie udało się uruchomić aparatu — użyj „Wgraj zdjęcie kodu” albo wpisz kod ręcznie.";
  }

  /** Najpierw szukaj w lokalnym katalogu, potem w Open Food Facts. */
  async function lookup(code: string) {
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setProduct(null);
    try {
      const local = products.find((p) => p.barcode === clean);
      if (local) {
        setProduct({
          code: clean,
          name: local.name,
          protein: local.protein,
          fat: local.fat,
          carbs: local.carbs,
          kcal: local.kcal,
        });
        setLoading(false);
        return;
      }
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
      setProduct({
        code: clean,
        name:
          data.product.product_name ||
          data.product.generic_name ||
          data.product.brands ||
          `Produkt (${clean})`,
        protein: round1Raw(n.proteins_100g ?? n.protein_100g),
        fat: round1Raw(n.fat_100g ?? n.fats_100g),
        carbs: round1Raw(n.carbohydrates_100g ?? n.carbs_100g),
        kcal: Math.round(Number(kcal) || 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się pobrać produktu");
    } finally {
      setLoading(false);
    }
  }

  /** Uruchamia skaner kodu QR i wyszukuje produkt po kodzie wyciągniętym z treści QR. */
  async function lookupQR(text: string) {
    const code = extractCodeFromQR(text);
    if (!code) {
      setError("Nie znaleziono kodu produktu w tym kodzie QR.");
      return;
    }
    await lookup(code);
  }

  async function startCamera(mode: "barcode" | "qr" = "barcode") {
    // Przełączanie trybu — zatrzymaj bieżący strumień przed startem nowego.
    if (streamRef.current) await stopCamera();
    setScanMode(mode);
    setError(null);
    setProduct(null);
    const video = videoRef.current;
    if (!video) {
      setCameraError("Aparat nie jest gotowy — odśwież stronę i spróbuj ponownie.");
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("", "NotFoundError");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (!stream.getVideoTracks().length) {
        throw new DOMException("", "NotFoundError");
      }
      // Atrybuty + właściwości, żeby WebView nie blokował odtwarzania.
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("autoplay", "");
      video.srcObject = stream;
      setScanning(true);
      setCameraError(null);
      try {
        await video.play();
      } catch {
        await new Promise((r) => setTimeout(r, 150));
        try {
          await video.play();
        } catch {
          // i tak spróbujemy dekodować — ZXing sam woła play()
        }
      }
      await waitForVideoFrames(video);
      if (video.videoWidth === 0) {
        // wideo nie ma klatek — stream nie działa
        throw new DOMException("", "NotFoundError");
      }
      const { BrowserMultiFormatReader } = await loadZxing();
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      reader.decodeFromStream(stream, video, (result) => {
        if (result) {
          const code = result.getText().trim();
          void stopCamera().then(() => (mode === "qr" ? lookupQR(code) : lookup(code)));
        }
      });
    } catch (e) {
      await stopCamera();
      setCameraError(cameraHint(e));
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
        const raw = result.getText().trim();
        if (/^\d{8,14}$/.test(raw)) {
          await lookup(raw); // zwykły kod kreskowy (czysty numer)
        } else {
          const code = extractCodeFromQR(raw); // kod QR (może być URL-em)
          if (code) await lookup(code);
          else setError("Nie znaleziono kodu produktu w tym kodzie.");
        }
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
        protein: round1(product.protein * (g / 100)),
        fat: round1(product.fat * (g / 100)),
        carbs: round1(product.carbs * (g / 100)),
        kcal: Math.round(product.kcal * (g / 100)),
      }
    : null;

  const mealOptions = Array.from({ length: Math.max(1, Math.min(meals, 10)) }, (_, i) => i + 1);
  const mealLabel = (m: number) => mealNames[m - 1] || `Posiłek ${m}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            scanning && scanMode === "barcode"
              ? void stopCamera()
              : void startCamera("barcode")
          }
          disabled={loading || scanning}
          className={`${scanning && scanMode === "barcode" ? "button-secondary" : "button-primary"} px-4 py-2.5 text-sm`}
        >
          {scanning && scanMode === "barcode" ? (
            <>
              <X size={16} /> Zatrzymaj skanowanie
            </>
          ) : (
            <>
              <ScanLine size={16} /> Kod kreskowy
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading || scanning}
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
          placeholder="np. 5902409703887"
          className="input w-44"
          value={manualCode}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setManualCode(event.target.value)}
        />
        <button
          type="button"
          onClick={() => lookup(manualCode)}
          disabled={loading || scanning}
          className="button-secondary px-4 py-2.5 text-sm"
        >
          <Search size={16} /> Szukaj
        </button>
      </div>

      {/* Skaner kodów QR — osobny przycisk pod skanerem kodu kreskowego. */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            scanning && scanMode === "qr"
              ? void stopCamera()
              : void startCamera("qr")
          }
          disabled={loading || scanning}
          className={`${scanning && scanMode === "qr" ? "button-secondary" : "button-primary"} px-4 py-2.5 text-sm`}
        >
          {scanning && scanMode === "qr" ? (
            <>
              <X size={16} /> Zatrzymaj skanowanie
            </>
          ) : (
            <>
              <QrCode size={16} /> Skanuj kod QR
            </>
          )}
        </button>
        <span className="text-xs text-slate-500">
          Dla produktów z kodem QR zamiast kreskowego (obsługuje linki GS1 i Open Food Facts).
        </span>
      </div>

      {/* Wideo zawsze w DOM — ref musi istnieć, zanim getUserMedia zwróci strumień. */}
      <div
        className={`${
          scanning
            ? "fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
            : "hidden"
        }`}
      >
        <div
          className={`${
            scanning ? "relative overflow-hidden rounded-2xl border border-lime-400/25 bg-black/60" : ""
          }`}
        >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`mx-auto aspect-video w-auto max-h-[85vh] max-w-[95vw] object-contain ${scanning ? "" : ""}`}
        />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-20 -translate-y-1/2 border-y-2 border-lime-400/80" />
        <p className="absolute inset-x-0 bottom-4 text-center text-sm font-extrabold text-lime-300 drop-shadow-lg">
          {scanMode === "qr" ? "Skieruj aparat na kod QR" : "Skieruj aparat na kod kreskowy"}
        </p>
        </div>
      </div>

      {cameraError && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {cameraError}
        </p>
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
              Posiłek
              <span className="select-shell">
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
              Data
              <input
                className="input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <div className="flex items-end rounded-xl bg-black/20 px-4 py-2.5">
              <p className="text-sm text-slate-300">
                Wpis: <b className="text-lime-300">{computed.kcal} kcal</b> · B{" "}
                {formatMacro(computed.protein)} g · T {formatMacro(computed.fat)} g · W{" "}
                {formatMacro(computed.carbs)} g
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
