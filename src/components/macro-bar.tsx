export function MacroBar({
  label,
  consumed,
  target,
  unit,
  barClass,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  barClass: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const remaining = Math.max(0, target - consumed);
  return (
    <div className="rounded-xl border border-white/[.06] bg-black/20 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="text-xs font-extrabold text-white">
          {consumed.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}{" "}
          <span className="text-slate-500">
            / {target.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} {unit}
          </span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.05]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1.5 text-[10px] font-bold ${remaining > 0 ? "text-slate-400" : "text-lime-300"}`}>
        {target > 0
          ? remaining > 0
            ? `zostało ${remaining.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} ${unit}`
            : "osiągnięto cel 🎉"
          : "brak celu"}
      </p>
    </div>
  );
}
