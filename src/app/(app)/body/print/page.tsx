import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { bodyMeasurements, progressPhotos } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fmt(n: number | null | undefined, unit: string): string {
  return n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(1)} ${unit}`;
}

const METRICS = [
  { label: "Waga", key: "weightKg" as const, unit: "kg" },
  { label: "Wzrost", key: "heightCm" as const, unit: "cm" },
  { label: "Klatka", key: "chestCm" as const, unit: "cm" },
  { label: "Talia", key: "waistCm" as const, unit: "cm" },
  { label: "Biodra", key: "hipCm" as const, unit: "cm" },
  { label: "Udo", key: "thighCm" as const, unit: "cm" },
  { label: "Biceps", key: "bicepsCm" as const, unit: "cm" },
  { label: "Łydka", key: "calfCm" as const, unit: "cm" },
];

export default async function BodyPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const q = await searchParams;
  const from = q.from ? new Date(`${q.from}T00:00:00`) : null;
  const to = q.to ? new Date(`${q.to}T23:59:59`) : null;
  const inPeriod = (date: Date) => (!from || date >= from) && (!to || date <= to);

  const [measurements, photos] = await Promise.all([
    db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, user.id))
      .orderBy(asc(bodyMeasurements.date)),
    db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, user.id))
      .orderBy(asc(progressPhotos.date)),
  ]);

  const measured = measurements.filter((row) => inPeriod(row.date));
  const pictured = photos.filter((row) => inPeriod(row.date) && row.photo);

  type DayEntry = {
    key: string;
    date: Date;
    measurements: typeof measured;
    photos: typeof pictured;
  };
  const byDay = new Map<string, DayEntry>();
  function day(date: Date): DayEntry {
    const key = dayKey(date);
    const current = byDay.get(key);
    if (current) return current;
    const next: DayEntry = { key, date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), measurements: [], photos: [] };
    byDay.set(key, next);
    return next;
  }
  for (const row of measured) day(row.date).measurements.push(row);
  for (const row of pictured) day(row.date).photos.push(row);
  const entries = Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  const first = measured[0] ?? null;
  const latest = measured[measured.length - 1] ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="print-hide flex items-center justify-between">
        <Link href="/body" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
          <ArrowLeft size={16} /> Wróć
        </Link>
        <PrintButton label="Drukuj / Zapisz PDF" />
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Raport ciała</p>
        <h1 className="text-2xl font-black text-white">Pomiary i zdjęcia progresu</h1>
        <p className="mt-2 text-xs text-slate-500">
          {from ? from.toLocaleDateString("pl-PL") : "Początek"} – {to ? to.toLocaleDateString("pl-PL") : "Dzisiaj"} ·
          zdjęcia przypisane do wpisów z tą samą datą · GYMRAT
        </p>
        <form className="print-hide mt-4 flex flex-wrap gap-2">
          <input className="input" type="date" name="from" defaultValue={q.from} />
          <input className="input" type="date" name="to" defaultValue={q.to} />
          <button className="button-secondary" type="submit">
            Filtruj okres
          </button>
        </form>
      </div>

      {first && latest && (
        <section className="panel p-6">
          <h2 className="mb-4 font-extrabold text-white">Pierwszy vs najnowszy pomiar</h2>
          <p className="mb-4 text-xs text-slate-500">
            {first.date.toLocaleDateString("pl-PL")} → {latest.date.toLocaleDateString("pl-PL")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.filter((m) => m.key !== "heightCm").map((m) => {
              const a = first[m.key];
              const b = latest[m.key];
              const diff = a != null && b != null ? b - a : null;
              return (
                <div key={m.key} className="rounded-xl border border-white/[.08] bg-black/15 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{m.label}</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {fmt(a, m.unit)} → {fmt(b, m.unit)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {diff == null
                      ? "—"
                      : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} ${m.unit}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {entries.length ? (
        entries.map((entry) => (
          <section key={entry.key} className="panel break-inside-avoid p-6">
            <h2 className="font-extrabold text-white">
              {entry.date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </h2>
            {entry.measurements.length ? (
              <div className="mt-4 space-y-3">
                {entry.measurements.map((row) => (
                  <div key={row.id} className="grid gap-2 sm:grid-cols-4">
                    {METRICS.map((m) => (
                      <p key={m.key} className="text-sm text-slate-300">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{m.label}</span>
                        <br />
                        <b className="text-white">{fmt(row[m.key], m.unit)}</b>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Brak pomiarów w tym dniu — tylko zdjęcie.</p>
            )}
            {entry.photos.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {entry.photos.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded-xl border border-white/[.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.photo ?? ""}
                      alt={`Zdjęcie progresu ${photo.date.toLocaleDateString("pl-PL")}`}
                      className="max-h-96 w-full object-contain bg-black/20"
                    />
                    <figcaption className="px-3 py-2 text-[11px] text-slate-500">
                      {photo.date.toLocaleDateString("pl-PL")}
                      {photo.note ? ` · ${photo.note}` : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        ))
      ) : (
        <section className="panel p-6">
          <p className="text-sm text-slate-500">Brak pomiarów i zdjęć w wybranym okresie.</p>
        </section>
      )}
    </div>
  );
}
