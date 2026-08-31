"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, UtensilsCrossed } from "lucide-react";
import { formatMacro } from "@/lib/diet";
import { EditDietLogButton } from "@/components/edit-diet-log-button";
import { DeleteDietLogButton } from "@/components/delete-diet-log-button";

/** Pojedynczy wpis dziennika przekazany z serwera — w pełni serializowalny. */
export type DietLogRow = {
  id: number;
  date: string; // ISO; zapisany jako lokalne południe, więc lokalna data jest stabilna
  dateLabel: string; // np. „31.08.2026”
  weekdayShort: string; // np. „Pon”
  mealNumber: number | null;
  mealLabel: string | null;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  grams: number;
  dayGoalKcal: number | null;
  note: string | null;
};

type DayGroup = { key: string; date: Date; rows: DietLogRow[]; kcal: number };
type WeekGroup = { key: string; label: string; days: DayGroup[]; kcal: number };
type MonthGroup = { key: string; label: string; weeks: WeekGroup[]; kcal: number };

function toStartOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
}
/** Poniedziałek tygodnia (ISO: poniedziałek–niedziela) dla danego dnia. */
function startOfWeek(d: Date): Date {
  const c = toStartOfDay(d);
  const day = c.getDay(); // 0 = niedziela
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  return c;
}
function weekLabel(mon: Date): string {
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Grupuje wpisy (sortowane malejąco po dacie) w hierarchię miesiąc > tydzień > dzień. */
function buildTree(rows: DietLogRow[]): MonthGroup[] {
  type Day = { date: Date; rows: DietLogRow[]; kcal: number };
  type Week = { label: string; days: Map<string, Day>; kcal: number };
  type Month = { label: string; weeks: Map<string, Week>; kcal: number };

  const monthMap = new Map<string, Month>();
  for (const row of rows) {
    const d = new Date(row.date);
    const ws = startOfWeek(d);
    const mK = monthKey(ws);
    const wK = dayKey(ws);
    const dK = dayKey(d);

    let m = monthMap.get(mK);
    if (!m) {
      m = { label: monthLabel(ws), weeks: new Map(), kcal: 0 };
      monthMap.set(mK, m);
    }
    let w = m.weeks.get(wK);
    if (!w) {
      w = { label: weekLabel(ws), days: new Map(), kcal: 0 };
      m.weeks.set(wK, w);
    }
    let day = w.days.get(dK);
    if (!day) {
      day = { date: toStartOfDay(d), rows: [], kcal: 0 };
      w.days.set(dK, day);
    }
    day.rows.push(row);
    day.kcal += row.kcal;
    w.kcal += row.kcal;
    m.kcal += row.kcal;
  }

  // Mapy zachowują kolejność wstawiania (malejąco), więc hierarchia też jest malejąca.
  return Array.from(monthMap.entries()).map(([mKey, m]) => ({
    key: mKey,
    label: m.label,
    kcal: m.kcal,
    weeks: Array.from(m.weeks.entries()).map(([wKey, w]) => ({
      key: wKey,
      label: w.label,
      kcal: w.kcal,
      days: Array.from(w.days.values()).map((day) => ({
        key: dayKey(day.date),
        date: day.date,
        rows: day.rows,
        kcal: day.kcal,
      })),
    })),
  }));
}

/**
 * Historia wpisów spożycia w układzie zwiijanym „miesiąc > tydzień > dzień”.
 * Każdy poziom jest osobno zwijany/rozwijany; dni pokazują poszczególne wpisy
 * wraz z edycją (od realnej gramatury) i usuwaniem.
 */
export function DietLogGroups({ rows }: { rows: DietLogRow[] }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const tree = useMemo(() => buildTree(rows), [rows]);

  if (!tree.length) {
    return (
      <div className="rounded-2xl border border-white/[.07] bg-black/15 p-6 text-center">
        <p className="text-sm text-slate-500">Brak wpisów. Dodaj pierwszy posiłek!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tree.map((month) => {
        const mKey = "m:" + month.key;
        const mOpen = !collapsed[mKey];
        return (
          <div key={month.key} className="rounded-xl border border-white/[.07] bg-black/15">
            <button
              type="button"
              onClick={() => toggle(mKey)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-white/[.02]"
            >
              {mOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
              <span className="font-extrabold capitalize text-white">{month.label}</span>
              <span className="ml-auto text-xs font-bold text-slate-400">{month.kcal.toLocaleString("pl-PL")} kcal</span>
            </button>

            {mOpen && (
              <div className="space-y-3 px-3 pb-3">
                {month.weeks.map((week) => {
                  const wKey = "w:" + week.key;
                  const wOpen = !collapsed[wKey];
                  return (
                    <div key={week.key} className="rounded-lg border border-white/[.06] bg-white/[.02]">
                      <button
                        type="button"
                        onClick={() => toggle(wKey)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/[.02]"
                      >
                        {wOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{week.label}</span>
                        <span className="ml-auto text-[11px] font-bold text-slate-500">{week.kcal.toLocaleString("pl-PL")} kcal</span>
                      </button>

                      {wOpen && (
                        <div className="space-y-3 p-3 pt-1">
                          {week.days.map((day) => {
                            const dKey = "d:" + day.key;
                            const dOpen = !collapsed[dKey];
                            return (
                              <div key={day.key} className="rounded-lg border border-white/[.06] bg-black/15">
                                <button
                                  type="button"
                                  onClick={() => toggle(dKey)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/[.02]"
                                >
                                  {dOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                                  <span className="text-xs font-bold text-white">
                                    {day.date.toLocaleDateString("pl-PL", { day: "2-digit", month: "long" })}{" "}
                                    <span className="font-normal text-slate-500">· {day.date.toLocaleDateString("pl-PL", { weekday: "long" })}</span>
                                  </span>
                                  <span className="ml-auto text-[11px] font-bold text-slate-500">{day.kcal.toLocaleString("pl-PL")} kcal</span>
                                </button>

                                {dOpen && (
                                  <div className="space-y-1.5 px-3 pb-3">
                                    {day.rows.map((row) => (
                                      <EntryRow key={row.id} row={row} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EntryRow({ row }: { row: DietLogRow }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/[.03] px-3 py-2">
      <span className="text-xs font-bold text-slate-300">{row.dateLabel}</span>
      {row.mealLabel && (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[.05] px-2 py-0.5 text-[10px] font-bold text-lime-300 ring-1 ring-white/10">
          <UtensilsCrossed size={10} /> {row.mealLabel}
        </span>
      )}
      <span className="text-xs text-slate-400">
        B {formatMacro(row.protein)} g · T {formatMacro(row.fat)} g · W {formatMacro(row.carbs)} g
      </span>
      <span className="text-[11px] font-bold text-slate-500">{Math.round(row.grams)} g</span>
      <span className="text-xs font-bold text-lime-300">{row.kcal.toLocaleString("pl-PL")} kcal</span>
      {row.dayGoalKcal != null && (
        <span className="text-[10px] text-slate-600">cel {row.dayGoalKcal.toLocaleString("pl-PL")} kcal</span>
      )}
      {row.note && <span className="max-w-xs truncate text-xs text-slate-400">{row.note}</span>}
      <div className="ml-auto flex gap-1">
        <EditDietLogButton
          log={{
            id: row.id,
            protein: row.protein,
            fat: row.fat,
            carbs: row.carbs,
            kcal: row.kcal,
            grams: row.grams,
            mealNumber: row.mealNumber,
            note: row.note,
          }}
        />
        <DeleteDietLogButton id={row.id} />
      </div>
    </div>
  );
}
