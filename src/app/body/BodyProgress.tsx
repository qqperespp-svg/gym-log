"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

export default function BodyProgress({ measurements }: { measurements: Measurement[] }) {
  const progress = useMemo(() => {
    if (measurements.length < 2) return null;
    const sorted = [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    const diff = (latest: string | null, first: string | null) => {
      if (!latest || !first) return null;
      return (parseFloat(latest) - parseFloat(first)).toFixed(1);
    };

    return {
      firstDate: first.date,
      latestDate: latest.date,
      changes: {
        weightKg: diff(latest.weightKg, first.weightKg),
        chestCm: diff(latest.chestCm, first.chestCm),
        waistCm: diff(latest.waistCm, first.waistCm),
        hipCm: diff(latest.hipCm, first.hipCm),
        thighCm: diff(latest.thighCm, first.thighCm),
        bicepsCm: diff(latest.bicepsCm, first.bicepsCm),
        calfCm: diff(latest.calfCm, first.calfCm),
      },
      latest: {
        weightKg: latest.weightKg,
        chestCm: latest.chestCm,
        waistCm: latest.waistCm,
        hipCm: latest.hipCm,
        thighCm: latest.thighCm,
        bicepsCm: latest.bicepsCm,
        calfCm: latest.calfCm,
      },
    };
  }, [measurements]);

  if (!progress || measurements.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
        <p className="text-4xl mb-4"></p>
        <p className="text-slate-400 font-semibold">Brak wystarczających danych</p>
        <p className="text-slate-500 text-sm mt-1">Dodaj co najmniej dwa pomiary, aby zobaczyć progres.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Podsumowanie progresu</h3>
      <p className="text-sm text-slate-400 mb-6">
        Od {new Date(progress.firstDate).toLocaleDateString()} do {new Date(progress.latestDate).toLocaleDateString()}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ProgressCard label="Waga" value={progress.latest.weightKg} unit="kg" change={progress.changes.weightKg} />
        <ProgressCard label="Klatka" value={progress.latest.chestCm} unit="cm" change={progress.changes.chestCm} />
        <ProgressCard label="Talia" value={progress.latest.waistCm} unit="cm" change={progress.changes.waistCm} />
        <ProgressCard label="Biodra" value={progress.latest.hipCm} unit="cm" change={progress.changes.hipCm} />
        <ProgressCard label="Udo" value={progress.latest.thighCm} unit="cm" change={progress.changes.thighCm} />
        <ProgressCard label="Ramię" value={progress.latest.bicepsCm} unit="cm" change={progress.changes.bicepsCm} />
        <ProgressCard label="Łydka" value={progress.latest.calfCm} unit="cm" change={progress.changes.calfCm} />
      </div>
    </div>
  );
}

function ProgressCard({ label, value, unit, change }: { label: string; value: string | null; unit: string; change: string | null }) {
  const numChange = change ? parseFloat(change) : 0;
  const isPositive = numChange > 0;
  const isNegative = numChange < 0;
  const isNeutral = numChange === 0;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-extrabold text-white">
        {value ? `${parseFloat(value).toFixed(1)} ${unit}` : "—"}
      </p>
      {change !== null && (
        <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-slate-500"}`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : isNegative ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          <span>{isPositive ? "+" : ""}{change} {unit}</span>
        </div>
      )}
    </div>
  );
}
