"use client";

import { useState } from "react";
import { ChartPie, PenLine } from "lucide-react";

type Section = "makro" | "wprowadzanie";

export function MichaTabs({
  makro,
  wprowadzanie,
}: {
  makro: React.ReactNode;
  wprowadzanie: React.ReactNode;
}) {
  const [active, setActive] = useState<Section>("makro");

  const tile = (section: Section) =>
    `rounded-2xl border p-4 text-left transition ${
      active === section
        ? "border-lime-400/40 bg-lime-400/[.08] ring-1 ring-lime-400/30"
        : "border-white/[.07] bg-black/15 hover:border-white/15"
    }`;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setActive("makro")} aria-pressed={active === "makro"} className={tile("makro")}>
          <span className="flex items-center gap-3">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
                active === "makro" ? "bg-lime-400 text-slate-950" : "bg-white/[.05] text-slate-400"
              }`}
            >
              <ChartPie size={20} />
            </span>
            <span className="min-w-0">
              <b className="block text-sm font-extrabold text-white">Makro</b>
              <span className="block text-xs leading-5 text-slate-500">
                Spożycie vs cel dzienny i tygodniowy, wpisy posiłków
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActive("wprowadzanie")}
          aria-pressed={active === "wprowadzanie"}
          className={tile("wprowadzanie")}
        >
          <span className="flex items-center gap-3">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-xl transition ${
                active === "wprowadzanie" ? "bg-lime-400 text-slate-950" : "bg-white/[.05] text-slate-400"
              }`}
            >
              <PenLine size={20} />
            </span>
            <span className="min-w-0">
              <b className="block text-sm font-extrabold text-white">Wprowadzanie</b>
              <span className="block text-xs leading-5 text-slate-500">
                Cele, katalog produktów, skaner, dodawanie posiłków
              </span>
            </span>
          </span>
        </button>
      </div>

      {active === "makro" ? makro : wprowadzanie}
    </div>
  );
}
