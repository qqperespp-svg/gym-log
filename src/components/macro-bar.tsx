export function MacroBar({
  label,
  consumed,
  target,
  unit,
  barClass,
  dailyValues,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  barClass: string;
  dailyValues?: number[];
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
      <div className="relative mt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[.05]">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
        </div>
        {dailyValues && dailyValues.length === 7 && (
          <>
            <div className="pointer-events-none absolute inset-y-[-3px] left-0 right-0 grid grid-cols-7">
              {dailyValues.slice(0, 6).map((_, index) => (
                <span key={index} className="justify-self-end border-r border-slate-300/60" aria-hidden="true" />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 text-center text-[9px] font-bold uppercase text-slate-500">
              {["pn", "wt", "śr", "czw", "pt", "sob", "nd"].map((day) => <span key={day}>{day}</span>)}
            </div>
          </>
        )}
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
