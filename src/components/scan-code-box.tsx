"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, ImagePlus, LoaderCircle, QrCode, ScanLine, X } from "lucide-react";
import { cameraHint, extractCodeFromQR, loadZxing, waitForVideoFrames, type ZXingReader } from "@/lib/zxing-client";

/**
 * Skaner kodów — OSOBNE przyciski dla kodu kreskowego i QR (nie można mieszać,
 * bo ZXing przy wspólnym trybie potrafi „czytać bzdury" z kodu kreskowego).
 * Tryby są rozdzielone przez `setHints` (ograniczenie listy formatów).
 * Po rozpoznaniu wywołuje `onCode(czystyKod)`.
 */
export function ScanCodeBox({ onCode, onError, autoScan }: { onCode: (code: string) => void; onError?: (msg: string) => void; autoScan?: boolean }) {
  const [mode, setMode] = useState<"barcode" | "qr">("barcode");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<ZXingReader | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoScan && !scanning) {
      void startScan("barcode");
    }
  }, [autoScan]);

  useEffect(() => {
    return () => {
      try {
        readerRef.current?.reset();
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopScan() {
    setScanning(false);
    try {
      readerRef.current?.reset();
    } catch {
      /* ignore */
    }
    readerRef.current = null;
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

  function handleDecoded(raw: string) {
    const text = raw.trim();
    const code = /^\d{8,14}$/.test(text) ? text : extractCodeFromQR(text);
    if (code) {
      stopScan();
      setErr(null);
      onCode(code);
    } else {
      setErr("Nie znaleziono kodu produktu w zeskanowanej treści.");
      onError?.("Nie znaleziono kodu produktu w zeskanowanej treści.");
    }
  }

  async function startScan(nextMode: "barcode" | "qr") {
    if (streamRef.current) await stopScan(); // przełączanie trybu w locie
    setMode(nextMode);
    setErr(null);
    const video = videoRef.current;
    if (!video) {
      setErr("Aparat nie jest gotowy — odśwież stronę i spróbuj ponownie.");
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
      if (!stream.getVideoTracks().length) throw new DOMException("", "NotFoundError");
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("autoplay", "");
      video.srcObject = stream;
      setScanning(true);
      try {
        await video.play();
      } catch {
        await new Promise((r) => setTimeout(r, 150));
        try {
          await video.play();
        } catch {
          /* i tak spróbujemy dekodować */
        }
      }
      await waitForVideoFrames(video);
      if (video.videoWidth === 0) throw new DOMException("", "NotFoundError");

      const zxing = await loadZxing();
      // Ograniczenie formatów — dzięki temu tryb kreskowy NIE czyta QR i odwrotnie.
      const hints = new Map();
      hints.set(
        zxing.DecodeHintType.POSSIBLE_FORMATS,
        nextMode === "qr"
          ? [zxing.BarcodeFormat.QR_CODE]
          : [
              zxing.BarcodeFormat.EAN_13,
              zxing.BarcodeFormat.EAN_8,
              zxing.BarcodeFormat.UPC_A,
              zxing.BarcodeFormat.UPC_E,
              zxing.BarcodeFormat.CODE_128,
              zxing.BarcodeFormat.CODE_39,
              zxing.BarcodeFormat.CODE_93,
              zxing.BarcodeFormat.CODABAR,
              zxing.BarcodeFormat.ITF,
            ],
      );
      const reader = new zxing.BrowserMultiFormatReader();
      if (typeof reader.setHints === "function") {
        try {
          reader.setHints(hints);
        } catch {
          /* starszy build bez setHints — lecimy dalej */
        }
      }
      readerRef.current = reader;
      reader.decodeFromStream(stream, video, (result) => {
        if (result) handleDecoded(result.getText());
      });
    } catch (e) {
      stopScan();
      const msg = cameraHint(e);
      setErr(msg);
      onError?.(msg);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setErr(null);
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
      if (result) handleDecoded(result.getText());
      else setErr("Nie rozpoznano kodu na zdjęciu.");
    } catch {
      setErr("Nie rozpoznano kodu na zdjęciu.");
    } finally {
      setBusy(false);
    }
  }

  const btn = (m: "barcode" | "qr") =>
    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
      scanning && mode === m
        ? "button-secondary"
        : "button-primary"
    }`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (scanning && mode === "barcode" ? stopScan() : void startScan("barcode"))}
          disabled={busy}
          className={btn("barcode")}
          title={scanning && mode === "barcode" ? "Zatrzymaj skanowanie" : "Zeskanuj kod kreskowy"}
        >
          {scanning && mode === "barcode" ? <X size={15} /> : <Barcode size={15} />}
          {scanning && mode === "barcode" ? "Zatrzymaj" : "Skanuj kod kreskowy"}
        </button>
        <button
          type="button"
          onClick={() => (scanning && mode === "qr" ? stopScan() : void startScan("qr"))}
          disabled={busy}
          className={btn("qr")}
          title={scanning && mode === "qr" ? "Zatrzymaj skanowanie" : "Zeskanuj kod QR"}
        >
          {scanning && mode === "qr" ? <X size={15} /> : <QrCode size={15} />}
          {scanning && mode === "qr" ? "Zatrzymaj" : "Skanuj kod QR"}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="icon-button"
          title="Wgraj zdjęcie kodu"
          aria-label="Wgraj zdjęcie kodu"
        >
          <ImagePlus size={15} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {busy && <LoaderCircle size={15} className="animate-spin text-lime-400" />}
      </div>

      <div className={`relative overflow-hidden rounded-xl border border-lime-400/25 bg-black/40 ${scanning ? "block" : "hidden"}`}>
        <video ref={videoRef} playsInline muted autoPlay className="mx-auto aspect-video max-h-56 w-full object-contain" />
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-bold text-lime-300">
          {mode === "qr" ? "Skieruj aparat na kod QR" : "Skieruj aparat na kod kreskowy"}
        </p>
      </div>

      {err && (
        <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {err}
        </p>
      )}
    </div>
  );
}
