"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Columns2,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Square,
  StretchHorizontal,
  X,
} from "lucide-react";

export type TileSize = "s" | "m" | "l";

export type TileDef = {
  id: string;
  label: string;
  defaultSize?: TileSize;
  node: React.ReactNode;
};

const STORAGE_KEY = "gymrat:dashboard-tiles-v2";

type Layout = { order: string[]; size: Record<string, TileSize>; hidden: Record<string, boolean> };

const SIZE_LABEL: Record<TileSize, string> = { s: "1 kolumna", m: "2 kolumny", l: "3 kolumny (pełna szerokość)" };

function defaultLayout(tiles: TileDef[]): Layout {
  return {
    order: tiles.map((tile) => tile.id),
    size: Object.fromEntries(
      tiles.map((tile) => [tile.id, tile.defaultSize ?? "s"] as [string, TileSize]),
    ),
    hidden: Object.fromEntries(tiles.map((tile) => [tile.id, false])),
  };
}

export function DashboardTiles({ tiles }: { tiles: TileDef[] }) {
  const [edit, setEdit] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>(() => defaultLayout(tiles));

  const byId = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles]);

  // Wczytaj zapisany układ po zamontowaniu (unika rozjazdu SSR/hydracji).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Layout>;
        const ids = tiles.map((tile) => tile.id);
        const order = (parsed.order ?? []).filter((id) => ids.includes(id));
        const missing = ids.filter((id) => !order.includes(id));
        setLayout({
          order: [...order, ...missing],
          size: {
            ...Object.fromEntries(tiles.map((tile) => [tile.id, tile.defaultSize ?? "s"])),
            ...(parsed.size ?? {}),
          },
          hidden: { ...Object.fromEntries(tiles.map((tile) => [tile.id, false])), ...(parsed.hidden ?? {}) },
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

  function setSize(id: string, size: TileSize) {
    setLayout((prev) => ({ ...prev, size: { ...prev.size, [id]: size } }));
  }

  function setHidden(id: string, hidden: boolean) {
    setLayout((prev) => ({ ...prev, hidden: { ...prev.hidden, [id]: hidden } }));
  }

  const visibleIds = layout.order.filter((id) => byId.has(id) && !layout.hidden[id]);
  const hiddenIds = layout.order.filter((id) => byId.has(id) && layout.hidden[id]);

  const spanClass = (id: string) => {
    const size = layout.size[id] ?? "s";
    if (size === "m") return "md:col-span-2 xl:col-span-2";
    if (size === "l") return "md:col-span-2 xl:col-span-3";
    return "";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {edit ? (
            <>
              <b className="text-lime-300">Tryb modyfikacji:</b> przeciągnij uchwyt{" "}
              <GripVertical size={13} className="inline" /> by przesunąć moduł, wybierz szerokość
              (1/2/3 kolumny) albo ukryj moduł. Układ zapisuje się na tym urządzeniu.
            </>
          ) : (
            <>W trybie modyfikacji zmienisz kolejność, rozmiar i widoczność modułów.</>
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

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleIds.map((id) => {
          const tile = byId.get(id)!;
          const size = layout.size[id] ?? "s";
          return (
            <div
              key={id}
              className={spanClass(id)}
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
                    title="Przeciągnij, aby przesunąć moduł"
                  >
                    <GripVertical size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-lime-200">
                    {tile.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* rozmiary */}
                    <div className="flex items-center gap-0.5 rounded-lg bg-black/20 p-0.5">
                      {(
                        [
                          { v: "s", icon: Square, title: "1 kolumna" },
                          { v: "m", icon: Columns2, title: "2 kolumny" },
                          { v: "l", icon: StretchHorizontal, title: "3 kolumny (pełna szerokość)" },
                        ] as const
                      ).map(({ v, icon: Icon, title }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setSize(id, v)}
                          className={`grid size-7 place-items-center rounded-md transition ${
                            size === v ? "bg-lime-400 text-slate-950" : "text-slate-400 hover:text-lime-300"
                          }`}
                          title={title}
                          aria-label={title}
                        >
                          <Icon size={13} />
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setHidden(id, true)}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                      title="Ukryj moduł"
                      aria-label={`Ukryj moduł ${tile.label}`}
                    >
                      <EyeOff size={15} />
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

      {edit && hiddenIds.length > 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <Eye size={14} /> Ukryte moduły ({hiddenIds.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {hiddenIds.map((id) => {
              const tile = byId.get(id)!;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setHidden(id, false)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-lime-400/40 hover:text-lime-300"
                  title={`Pokaż ${tile.label}`}
                >
                  <Eye size={13} /> {tile.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            Kliknij moduł, aby przywrócić go na dashboard. Szerokość i pozycja zostają zapamiętane.
          </p>
        </div>
      )}

      {edit && hiddenIds.length === 0 && (
        <p className="rounded-xl bg-black/10 px-4 py-3 text-[11px] text-slate-600">
          Aktualny rozmiar: {visibleIds.map((id) => `${byId.get(id)!.label} — ${SIZE_LABEL[layout.size[id] ?? "s"]}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
