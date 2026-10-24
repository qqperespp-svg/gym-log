import { Umbrella } from "lucide-react";
import type { VacationRange } from "@/lib/diet";

function fmt(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

/** Blok urlopu na PDF — te same dni w raporcie posiłków i treningów. */
export function PrintVacationSection({
  vacations,
}: {
  vacations: Array<VacationRange & { note?: string | null }>;
}) {
  return (
    <div className="panel p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
        <Umbrella size={14} /> Urlop
      </p>
      {vacations.length ? (
        <>
          <p className="mt-1 text-xs text-slate-500">Te dni nie wliczają się do podsumowania raportu.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-white">
            {vacations.map((v, i) => (
              <li key={`${fmt(v.startDate)}-${fmt(v.endDate)}-${i}`} className="flex flex-wrap gap-x-2">
                <span className="font-bold">
                  {fmt(v.startDate)} – {fmt(v.endDate)}
                </span>
                {v.note ? <span className="text-slate-400">· {v.note}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-400">Brak dni urlopu w tym okresie.</p>
      )}
    </div>
  );
}
