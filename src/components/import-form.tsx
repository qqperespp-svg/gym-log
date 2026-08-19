"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { importDataAction } from "@/actions/settings";

export function ImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState("");

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setData(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function submit() {
    if (!data) {
      alert("Najpierw wybierz plik JSON.");
      return;
    }
    if (!window.confirm("Import nadpisze dane diety i pomiarów. Kontynuować?")) return;
    const fd = new FormData();
    fd.set("data", data);
    await importDataAction(fd);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => fileRef.current?.click()} className="button-secondary">
        <Upload size={17} /> Wybierz plik JSON
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <button type="button" onClick={() => void submit()} className="button-secondary">
        Importuj
      </button>
      {data && <span className="text-xs text-slate-500">Wybrano plik ({Math.round(data.length / 1024)} KB)</span>}
    </div>
  );
}
