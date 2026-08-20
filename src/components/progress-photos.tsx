"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { addProgressPhotoAction, deleteProgressPhotoAction } from "@/actions/diet";
import type { ProgressPhoto } from "@/db/schema";

/** Kompresuje zdjęcie do data URI (max ~800 px, JPEG) — mieści się w bazie. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProgressPhotos({ photos }: { photos: ProgressPhoto[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();

  async function onFile(file: File | null) {
    if (!file) return;
    setPending(true);
    try {
      const photo = await compressImage(file);
      const formData = new FormData();
      formData.set("photo", photo);
      formData.set("note", "");
      await addProgressPhotoAction(formData);
    } finally {
      setPending(false);
    }
  }

  /** Usuwa zdjęcie po potwierdzeniu i odświeża widok od razu. */
  async function remove(id: number) {
    if (!window.confirm("Usunąć to zdjęcie sylwetki?")) return;
    setDeletingId(id);
    try {
      await deleteProgressPhotoAction(id);
      router.refresh(); // natychmiast odśwież dane sekcji
    } finally {
      setDeletingId(null);
    }
  }

  const first = photos[0] ?? null;
  const latest = photos[photos.length - 1] ?? null;

  // Przycisk usuwania — zawsze widoczny (na ekranach dotykowych nie ma hovera).
  const deleteBtn = (p: ProgressPhoto) => (
    <button
      type="button"
      onClick={() => void remove(p.id)}
      disabled={deletingId === p.id}
      className="absolute right-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-lg bg-black/70 text-rose-300 ring-1 ring-white/15 backdrop-blur transition hover:bg-rose-500 hover:text-white disabled:opacity-50"
      aria-label="Usuń zdjęcie"
      title="Usuń zdjęcie"
    >
      <Trash2 size={13} />
    </button>
  );

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => inputRef.current?.click()} className="button-secondary">
        <Camera size={16} /> {pending ? "Dodawanie…" : "Dodaj zdjęcie sylwetki"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {first && latest && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[first, latest].map((p, i) => (
            <figure key={p.id} className="relative overflow-hidden rounded-xl border border-white/[.07]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo ?? ""} alt={`Zdjęcie progresu ${i === 0 ? "pierwsze" : "najnowsze"}`} className="w-full object-cover" />
              {deleteBtn(p)}
              <figcaption className="px-3 py-2 text-[11px] text-slate-500">
                {i === 0 ? "Pierwsze" : "Najnowsze"} · {p.date.toLocaleDateString("pl-PL")}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-lg border border-white/[.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo ?? ""} alt="" className="aspect-square w-full object-cover" />
              {deleteBtn(p)}
            </div>
          ))}
        </div>
      )}

      {!photos.length && <p className="text-sm text-slate-500">Brak zdjęć. Dodaj pierwsze — przegląd „przed/po" pojawi się tutaj.</p>}
    </div>
  );
}
