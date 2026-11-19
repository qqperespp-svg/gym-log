"use client";

import { Plus, Trash2, Umbrella } from "lucide-react";
import { addVacationAction, deleteVacationAction } from "@/actions/diet";
import type { DietVacation } from "@/db/schema";
import { isVacationDay } from "@/lib/diet";

function asDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function fmt(d: Date | string): string {
  return asDate(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

function todayValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function VacationForm({ vacations }: { vacations: DietVacation[] }) {
  const today = new Date();
  const onVacation = isVacationDay(today, vacations);
  const upcoming = [...vacations].sort((a, b) => asDate(a.startDate).getTime() - asDate(b.startDate).getTime());

  return (
    <div className="space-y-4">
      {onVacation && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[.08] px-4 py-3 text-sm text-amber-100">
          <Umbrella size={18} className="mt-0.5 shrink-0 text-amber-300" />
          <div>
            <p className="font-extrabold text-amber-200">Dziś masz urlop</p>
            <p className="mt-0.5 text-xs leading-5 text-amber-100/80">
              Kalorie i makro z dzisiaj nie wliczają się do celów dziennych i tygodniowych. Możesz nadal logować
              posiłki — nie będą liczone.
            </p>
          </div>
        </div>
      )}

      <form action={addVacationAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
        <label className="field-label">
          Od
          <input className="input" type="date" name="startDate" required defaultValue={todayValue()} />
        </label>
        <label className="field-label">
          Do
          <input className="input" type="date" name="endDate" required defaultValue={todayValue()} />
        </label>
        <label className="field-label">
          Notatka (opcjonalnie)
          <input className="input" type="text" name="note" maxLength={120} placeholder="np. wyjazd, święta…" />
        </label>
        <div className="flex items-end">
          <button type="submit" className="button-primary w-full justify-center lg:w-auto">
            <Plus size={16} /> Dodaj urlop
          </button>
        </div>
      </form>

      {upcoming.length > 0 ? (
        <ul className="space-y-2">
          {upcoming.map((v) => {
            const active = isVacationDay(today, [v]);
            const past = asDate(v.endDate).getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            return (
              <li
                key={v.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  active
                    ? "border-amber-400/30 bg-amber-400/[.07]"
                    : "border-white/[.06] bg-black/15"
                }`}
              >
                <Umbrella size={16} className={active ? "text-amber-300" : "text-slate-500"} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">
                    {fmt(v.startDate)}
                    {asDate(v.startDate).toDateString() !== asDate(v.endDate).toDateString() ? ` – ${fmt(v.endDate)}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {active ? "trwa teraz · " : past ? "zakończony · " : "nadchodzący · "}
                    {v.note || "kalorie i makro nie liczone"}
                  </p>
                </div>
                <form action={deleteVacationAction.bind(null, v.id)}>
                  <button
                    type="submit"
                    className="icon-button hover:!text-rose-300"
                    aria-label="Usuń urlop"
                    title="Usuń urlop"
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          Brak zaplanowanych urlopów. W tych dniach spożycie nie wlicza się do celów.
        </p>
      )}
    </div>
  );
}
