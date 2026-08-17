"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteBodyMeasurement } from "./actions";

type Measurement = {
  id: number;
  weightKg: string | null;
  heightCm: string | null;
  chestCm: string | null;
  waistCm: string | null;
  hipCm: string | null;
  thighCm: string | null;
  bicepsCm: string | null;
  calfCm: string | null;
  date: Date;
};

export default function BodyHistory({ measurements }: { measurements: Measurement[] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-xl font-bold text-white">Historia pomiarów</h3>
      </div>
      {measurements.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">Brak zapisanych pomiarów.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold text-right">Waga</th>
                <th className="px-4 py-3 font-semibold text-right">Wzrost</th>
                <th className="px-4 py-3 font-semibold text-right">Klatka</th>
                <th className="px-4 py-3 font-semibold text-right">Talia</th>
                <th className="px-4 py-3 font-semibold text-right">Biodra</th>
                <th className="px-4 py-3 font-semibold text-right">Udo</th>
                <th className="px-4 py-3 font-semibold text-right">Ramię</th>
                <th className="px-4 py-3 font-semibold text-right">Łydka</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-950/40 transition">
                  <td className="px-5 py-3.5 font-mono text-white whitespace-nowrap">{new Date(m.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.weightKg ? `${parseFloat(m.weightKg).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.heightCm ? `${parseFloat(m.heightCm).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.chestCm ? `${parseFloat(m.chestCm).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.waistCm ? `${parseFloat(m.waistCm).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.hipCm ? `${parseFloat(m.hipCm).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.thighCm ? `${parseFloat(m.thighCm).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.bicepsCm ? `${parseFloat(m.bicepsCm).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">{m.calfCm ? `${parseFloat(m.calfCm).toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3.5 text-right">
                    <DeleteButton id={m.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeleteButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button onClick={() => { if (confirm("Usunąć ten pomiar?")) startTransition(async () => { await deleteBodyMeasurement(id); }); }} disabled={pending} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition">
      {pending ? <span className="w-4 h-4 block animate-spin"></span> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
