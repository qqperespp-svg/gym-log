"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, ScanLine, X } from "lucide-react";
import { cameraHint, extractCodeFromQR, loadZxing, waitForVideoFrames, type ZXingReader } from "@/lib/zxing-client";

/**
 * Pole kodu produktu z możliwością zeskanowania kodu kreskowego lub QR
 * (kamera + zdjęcie). Używane m.in. przy dodawaniu własnego produktu do katalogu —
 * wynik skanu trafia do pola jako wartość formularza (name).
 */
export function CodeScanInput({
  name,
  placeholder = "np. 5902409703887",
  label = "Skanuj kod",
}: {
  name: string;
  placeholder?: string;
  label?: string;
}) {
  const [value, setValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<ZXingReader | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  /** Wpisuje rozpoznany kod do pola (obsługuje też kody QR będące linkami). */
  function handleDecoded(raw: string) {
    const text = raw.trim();
    const code = /^\d{8,14}$/.test(text) ? text : extractCodeFromQR(text);
    if (code) {
      setValue(code);
      setErr(null);
      stopScan();
    } else {
      setErr("Nie znaleziono kodu produktu w zeskanowanej treści.");
    }
  }

  async function startScan() {
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
      const { BrowserMultiFormatReader } = await loadZxing();
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      reader.decodeFromStream(stream, video, (result) => {
        if (result) handleDecoded(result.getText());
      });
    } catch (e) {
      stopScan();
      setErr(cameraHint(e));
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input min-w-0 flex-1"
          name={name}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setErr(null);
          }}
        />
        <button
          type="button"
          onClick={() => (scanning ? stopScan() : void startScan())}
          disabled={busy}
          className={`${scanning ? "button-secondary" : "button-primary"} px-3 py-2.5 text-sm`}
          title={scanning ? "Zatrzymaj skanowanie" : "Zeskanuj kod kreskowy lub QR"}
        >
          {scanning ? <X size={15} /> : <ScanLine size={15} />} {label}
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
      </div>

      <div className={`relative overflow-hidden rounded-xl border border-lime-400/25 bg-black/40 ${scanning ? "block" : "hidden"}`}>
        <video ref={videoRef} playsInline muted autoPlay className="mx-auto aspect-video max-h-56 w-full object-contain" />
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-bold text-lime-300">
          Skieruj aparat na kod kreskowy lub QR
        </p>
      </div>

      {busy && <p className="text-xs text-slate-400">Rozpoznaję kod ze zdjęcia…</p>}
      {err && (
        <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {err}
        </p>
      )}
    </div>
  );
}
