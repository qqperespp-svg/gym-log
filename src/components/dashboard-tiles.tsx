"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, GripVertical, LayoutGrid, Maximize2, Minimize2, X } from "lucide-react";

export type TileDef = {
  id: string;
  label: string;
  defaultFull?: boolean;
  node: React.ReactNode;
};

const STORAGE_KEY = "gymrat:dashboard-tiles";

type Layout = { order: string[]; full: Record<string, boolean> };

export function DashboardTiles({ tiles }: { tiles: TileDef[] }) {
  const [edit, setEdit] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>(() => ({
    order: tiles.map((tile) => tile.id),
    full: Object.fromEntries(tiles.filter((tile) => tile.defaultFull).map((tile) => [tile.id, true])),
  }));

  const byId = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles]);

  // Wczytaj zapisany układ po zamontowaniu (dopiero wtedy — unika rozjazdu SSR/hydracji).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Layout;
        const ids = tiles.map((tile) => tile.id);
        const order = (parsed.order ?? []).filter((id) => ids.includes(id));
        const missing = ids.filter((id) => !order.includes(id));
        setLayout({
          order: [...order, ...missing],
          full: {
            ...Object.fromEntries(tiles.filter((tile) => tile.defaultFull).map((tile) => [tile.id, true])),
            ...(parsed.full ?? {}),
          },
        });
      }
    } catch {
      // ignoruj uszkodzony zapis
    }
    setLoaded(true);
  }, []);

  // Zapisuj układ.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // brak dostępu do localStorage — ignoruj
    }
  }, [layout, loaded]);

  function move(from: string, to: string) {
    setLayout((prev) => {
      const next = [...prev.order];
      const i = next.indexOf(from);
      const j = next.indexOf(to);
      if (i < 0 || j < 0 || i === j) return prev;
      next.splice(i, 1);
      next.splice(j, 0, from);
      return { ...prev, order: next };
    });
  }

  function toggleSize(id: string) {
    setLayout((prev) => ({ ...prev, full: { ...prev.full, [id]: !prev.full[id] } }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {edit ? (
            <>
              <b className="text-lime-300">Tryb modyfikacji:</b> przeciągnij uchwyt{" "}
              <GripVertical size={13} className="inline" /> na inny kafelek, by go przesunąć, albo
              zmień szerokość. Układ zapisuje się na tym urządzeniu.
            </>
          ) : (
            <>
              Przesuwaj kafelki i zmieniaj ich rozmiar w trybie modyfikacji.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setEdit((value) => !value)}
          className={`${edit ? "button-primary" : "button-secondary"} px-4 py-2 text-sm`}
        >
          {edit ? (
            <>
              <Check size={16} /> Gotowe
            </>
          ) : (
            <>
              <LayoutGrid size={16} /> Modyfikuj
            </>
          )}
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {layout.order
          .filter((id) => byId.has(id))
          .map((id) => {
            const tile = byId.get(id)!;
            const isFull = !!layout.full[id];
            return (
              <div
                key={id}
                className={isFull ? "md:col-span-2" : ""}
                onDragOver={(event) => {
                  if (!edit || !dragging || dragging === id) return;
                  event.preventDefault();
                  move(dragging, id);
                }}
              >
                {edit && (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-lime-400/25 bg-lime-400/[.08] px-3 py-2">
                    <span
                      draggable
                      onDragStart={(event) => {
                        setDragging(id);
                        event.dataTransfer.setData("text/plain", id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragging(null)}
                      className="grid size-8 cursor-grab place-items-center rounded-lg bg-lime-400/15 text-lime-300 active:cursor-grabbing"
                      title="Przeciągnij, aby przesunąć kafelek"
                    >
                      <GripVertical size={16} />
                    </span>
                    <span className="text-xs font-bold text-lime-200">{tile.label}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSize(id)}
                        className="grid size-8 place-items-center rounded-lg text-lime-300 transition hover:bg-lime-400/15"
                        title={isFull ? "Zmniejsz (1 kolumna)" : "Rozciągnij (2 kolumny)"}
                      >
                        {isFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEdit(false)}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                        title="Zamknij tryb modyfikacji"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                )}
                <div className={edit ? "rounded-2xl ring-2 ring-lime-400/40" : ""}>{tile.node}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
