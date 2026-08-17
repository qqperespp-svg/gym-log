"use client";

import { useTransition, useState } from "react";
import { Check, Pencil, Target, X } from "lucide-react";
import { updateWeeklyGoalAction } from "@/actions/dashboard";

export function WeeklyGoalCard({
  goal,
  weeklyCount,
}: {
  goal: number;
  weeklyCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal);
  const [saved, setSaved] = useState(goal);
  const [pending, startTransition] = useTransition();

  const current = saved;
  const progress = Math.min(100, Math.round((weeklyCount / current) * 100));
  const remaining = Math.max(0, current - weeklyCount);

  function save() {
    const clean = Math.min(Math.max(Math.round(value) || 1, 1), 14);
    setValue(clean);
    startTransition(async () => {
      const confirmed = await updateWeeklyGoalAction(clean);
      setSaved(confirmed);
      setEditing(false);
    });
  }

  function cancel() {
    setValue(saved);
    setEditing(false);
  }

  return (
    <article className="panel p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
            Cel tygodniowy
          </p>
          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="input-shell !min-h-0 !py-1.5">
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={value}
                  onChange={(event) => setValue(Number(event.target.value))}
                  aria-label="Liczba treningów tygodniowo"
                />
                <span className="text-xs text-slate-500">treningi</span>
              </span>
              <button
                onClick={save}
                disabled={pending}
                className="icon-button !text-lime-400 hover:!bg-lime-400/10"
                aria-label="Zapisz cel"
              >
                <Check size={17} />
              </button>
              <button onClick={cancel} className="icon-button" aria-label="Anuluj">
                <X size={17} />
              </button>
            </div>
          ) : (
            <p className="mt-1 text-2xl font-black text-white">
              {weeklyCount}{" "}
              <span className="text-sm font-medium text-slate-600">/ {current} treningi</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => {
                setValue(saved);
                setEditing(true);
              }}
              className="icon-button"
              aria-label="Edytuj cel tygodniowy"
              title="Edytuj cel"
            >
              <Pencil size={14} />
            </button>
          )}
          <span className="grid size-11 place-items-center rounded-xl bg-lime-400/10 text-lime-400">
            <Target size={20} />
          </span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[.05]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-300 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {progress >= 100
          ? "Cel zrobiony. Świetna robota!"
          : `Jeszcze ${remaining} — dasz radę.`}
      </p>
    </article>
  );
}
