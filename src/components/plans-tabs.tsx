"use client";

import { useState } from "react";
import { CalendarRange, Dumbbell } from "lucide-react";

type Section = "programy" | "cwiczenia";

export function PlansTabs({
  programy,
  cwiczenia,
}: {
  programy: React.ReactNode;
  cwiczenia: React.ReactNode;
}) {
  const [active, setActive] = useState<Section>("programy");

  const tile = (section: Section) =>
    `rounded-2xl border p-4 text-left transition ${
      active === section
        ? "border-lime-400/40 bg-lime-400/[.08] ring-1 ring-lime-400/30"
        : "border-white/[.07] bg-black/15 hover:border-white/15"
    }`;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setActive("programy")} aria-pressed={active === "programy"} className={tile("programy")}>
          <span className="flex items-center gap-3">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
                active === "programy" ? "bg-lime-400 text-slate-950" : "bg-white/[.05] text-slate-400"
              }`}
            >
              <CalendarRange size={20} />
            </span>
            <span className="min-w-0">
              <b className="block text-sm font-extrabold text-white">Programy</b>
              <span className="block text-xs leading-5 text-slate-500">
                Gotowe zestawy ćwiczeń do planowania
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActive("cwiczenia")}
          aria-pressed={active === "cwiczenia"}
          className={tile("cwiczenia")}
        >
          <span className="flex items-center gap-3">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
                active === "cwiczenia" ? "bg-lime-400 text-slate-950" : "bg-white/[.05] text-slate-400"
              }`}
            >
              <Dumbbell size={20} />
            </span>
            <span className="min-w-0">
              <b className="block text-sm font-extrabold text-white">Ćwiczenia</b>
              <span className="block text-xs leading-5 text-slate-500">
                Biblioteka ruchów i dodawanie własnych
              </span>
            </span>
          </span>
        </button>
      </div>

      {active === "programy" ? programy : cwiczenia}
    </div>
  );
}
