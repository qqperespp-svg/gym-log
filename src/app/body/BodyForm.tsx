"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { addBodyMeasurement } from "./actions";

export default function BodyForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    weightKg: "",
    heightCm: "",
    chestCm: "",
    waistCm: "",
    hipCm: "",
    thighCm: "",
    bicepsCm: "",
    calfCm: "",
    date: new Date().toISOString().split("T")[0],
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await addBodyMeasurement(form);
      setForm({
        weightKg: "",
        heightCm: "",
        chestCm: "",
        waistCm: "",
        hipCm: "",
        thighCm: "",
        bicepsCm: "",
        calfCm: "",
        date: new Date().toISOString().split("T")[0],
      });
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2.5 transition shadow shadow-amber-900/20">
        <Plus className="w-4 h-4" /> Dodaj pomiary
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Waga (kg)" name="weightKg" value={form.weightKg} onChange={setForm} step="0.1" />
        <Field label="Wzrost (cm)" name="heightCm" value={form.heightCm} onChange={setForm} step="0.1" />
        <Field label="Klatka (cm)" name="chestCm" value={form.chestCm} onChange={setForm} step="0.1" />
        <Field label="Talia (cm)" name="waistCm" value={form.waistCm} onChange={setForm} step="0.1" />
        <Field label="Biodra (cm)" name="hipCm" value={form.hipCm} onChange={setForm} step="0.1" />
        <Field label="Udo (cm)" name="thighCm" value={form.thighCm} onChange={setForm} step="0.1" />
        <Field label="Ramię (cm)" name="bicepsCm" value={form.bicepsCm} onChange={setForm} step="0.1" />
        <Field label="Łydka (cm)" name="calfCm" value={form.calfCm} onChange={setForm} step="0.1" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Data</label>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full md:w-auto rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 transition">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Zapisz
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-white px-3 py-2">Anuluj</button>
      </div>
    </form>
  );
}

function Field({ label, name, value, onChange, step }: { label: string; name: string; value: string; onChange: (f: any) => void; step: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-1.5">{label}</label>
      <input type="number" step={step} min="0" value={value} onChange={(e) => onChange((f: any) => ({ ...f, [name]: e.target.value }))} placeholder="—" className="w-full rounded-xl bg-slate-950 border border-slate-700 text-white px-4 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500" />
    </div>
  );
}
