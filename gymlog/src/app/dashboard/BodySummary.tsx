import { Scale, Ruler } from "lucide-react";

type Measurement = {
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

export default function BodySummary({ measurements }: { measurements: Measurement[] }) {
  if (measurements.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Body Measurements</h3>
          <a href="/body" className="text-sm text-amber-400 font-semibold hover:underline">View all</a>
        </div>
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No body measurements yet.</p>
          <a href="/body" className="inline-block mt-2 text-sm text-amber-400 font-semibold hover:underline">Add your first measurement</a>
        </div>
      </div>
    );
  }

  const latest = measurements[measurements.length - 1];
  const first = measurements[0];

  const diff = (latest: string | null, first: string | null) => {
    if (!latest || !first) return null;
    const d = parseFloat(latest) - parseFloat(first);
    return d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Body Measurements</h3>
        <a href="/body" className="text-sm text-amber-400 font-semibold hover:underline">View all</a>
      </div>
      <p className="text-xs text-slate-500 mb-4">Latest: {new Date(latest.date).toLocaleDateString()} (vs first: {new Date(first.date).toLocaleDateString()})</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BodyStat icon={<Scale className="w-4 h-4 text-amber-400" />} label="Weight" value={latest.weightKg} unit="kg" change={diff(latest.weightKg, first.weightKg)} />
        <BodyStat icon={<Ruler className="w-4 h-4 text-emerald-400" />} label="Height" value={latest.heightCm} unit="cm" change={null} />
        <BodyStat icon={<Ruler className="w-4 h-4 text-emerald-400" />} label="Chest" value={latest.chestCm} unit="cm" change={diff(latest.chestCm, first.chestCm)} />
        <BodyStat icon={<Ruler className="w-4 h-4 text-emerald-400" />} label="Waist" value={latest.waistCm} unit="cm" change={diff(latest.waistCm, first.waistCm)} />
        <BodyStat icon={<Ruler className="w-4 h-4 text-emerald-400" />} label="Hips" value={latest.hipCm} unit="cm" change={diff(latest.hipCm, first.hipCm)} />
        <BodyStat icon={<Ruler className="w-4 h-4 text-emerald-400" />} label="Thigh" value={latest.thighCm} unit="cm" change={diff(latest.thighCm, first.thighCm)} />
        <BodyStat icon={<Ruler className="w-4 h-4 text-emerald-400" />} label="Biceps" value={latest.bicepsCm} unit="cm" change={diff(latest.bicepsCm, first.bicepsCm)} />
        <BodyStat icon={<Ruler className="w-4 h-4 text-emerald-400" />} label="Calf" value={latest.calfCm} unit="cm" change={diff(latest.calfCm, first.calfCm)} />
      </div>
    </div>
  );
}

function BodyStat({ icon, label, value, unit, change }: { icon: React.ReactNode; label: string; value: string | null; unit: string; change: string | null }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-extrabold text-white">{value ? `${parseFloat(value).toFixed(1)} ${unit}` : "—"}</p>
      {change && (
        <p className={`text-xs font-semibold mt-1 ${change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>{change} {unit}</p>
      )}
    </div>
  );
}
