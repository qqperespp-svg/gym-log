// Wspólna logika kliencka skanowania kodów (ZXing) — używana przez skaner
// w Dzienniku spożycia (scan-code-box) oraz pole kodu przy dodawaniu produktów
// (code-scan-input).
// UWAGA: ten moduł operuje na `window` — importować tylko z komponentów "use client".

export type ZXingReader = {
  decodeFromStream(
    stream: MediaStream,
    video: HTMLVideoElement,
    callback: (result: { getText(): string } | null) => void,
  ): unknown;
  decodeFromImageUrl(url: string): Promise<{ getText(): string } | null>;
  setHints?(hints: Map<string, string[]>): void;
  reset(): void;
};

export type ZXingGlobal = {
  BrowserMultiFormatReader: new () => ZXingReader;
  DecodeHintType: { POSSIBLE_FORMATS: string };
  BarcodeFormat: Record<string, string>;
};

/** Ładuje silnik ZXing z pliku wbudowanego w aplikację (public/vendor/zxing.min.js). */
export function loadZxing(): Promise<ZXingGlobal> {
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

/** Czeka, aż wideo ma realne klatki (rozmiar > 0) — bez tego ZXing nie ma czego dekodować. */
export function waitForVideoFrames(video: HTMLVideoElement, timeout = 7000): Promise<void> {
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
export function extractCodeFromQR(text: string): string | null {
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

/** Czytelny komunikat o błędzie aparatu. */
export function cameraHint(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Brak zgody na aparat — odblokuj kamerę dla tej strony w ustawieniach przeglądarki / aplikacji.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Nie znaleziono aparatu na tym urządzeniu.";
  }
  return "Nie udało się uruchomić aparatu — użyj „Wgraj zdjęcie kodu” albo wpisz kod ręcznie.";
}
