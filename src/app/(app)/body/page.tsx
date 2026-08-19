import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Ruler, TrendingDown, TrendingUp } from "lucide-react";
import { db } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { saveBodyAction, updateBodyAction } from "@/actions/body";
import { progressPhotos } from "@/db/schema";
import { BodyCharts } from "@/components/body-charts";
import { ProgressPhotos } from "@/components/progress-photos";
import { DeleteMeasurementButton } from "@/components/delete-measurement-button";

export const dynamic = "force-dynamic";

function Trend({ first: a, latest: b }: { first: number | null; latest: number | null }) {
  if (a == null || b == null) return <span className="text-slate-600">—</span>;
  const diff = b - a;
  if (Math.abs(diff) < 0.1) return <span className="text-slate-400">0</span>;
  const isDown = diff < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-extrabold ${
        isDown ? "text-emerald-400" : "text-rose-300"
      }`}
    >
      {isDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
      {Math.abs(diff).toFixed(1)} cm ({isDown ? "-" : "+"}
      {Math.abs(Math.round((diff / Math.abs(a)) * 100))}%)
    </span>
  );
}

export default async function BodyPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const editId = params.edit ? Number(params.edit) : 0;
  const rows = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, user.id))
    .orderBy(desc(bodyMeasurements.date));
  const photos = await db.select().from(progressPhotos).where(eq(progressPhotos.userId, user.id)).orderBy(asc(progressPhotos.date));
  const first = rows[rows.length - 1] ?? null;
  const latest = rows[0] ?? null;
  const editRow = editId > 0 ? (rows.find((row) => row.id === editId) ?? null) : null;

  const metrics = [
    { label: "Waga", key: "weightKg", first: first?.weightKg ?? null, latest: latest?.weightKg ?? null, unit: "kg" },
    { label: "Klatka", key: "chestCm", first: first?.chestCm ?? null, latest: latest?.chestCm ?? null, unit: "cm" },
    { label: "Talia", key: "waistCm", first: first?.waistCm ?? null, latest: latest?.waistCm ?? null, unit: "cm" },
    { label: "Biodra", key: "hipCm", first: first?.hipCm ?? null, latest: latest?.hipCm ?? null, unit: "cm" },
    { label: "Udo", key: "thighCm", first: first?.thighCm ?? null, latest: latest?.thighCm ?? null, unit: "cm" },
    { label: "Biceps", key: "bicepsCm", first: first?.bicepsCm ?? null, latest: latest?.bicepsCm ?? null, unit: "cm" },
    { label: "Łydka", key: "calfCm", first: first?.calfCm ?? null, latest: latest?.calfCm ?? null, unit: "cm" },
  ];

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Pomiar ciała</p>
        <h1 className="page-title">Ciało</h1>
        <p className="mt-2 text-sm text-slate-500">Wzrost, waga i wymiary. Śledź progres z każdą sesją.</p>
      </header>

      {params.saved === "1" && (
        <div className="rounded-xl border border-lime-400/20 bg-lime-400/[.08] px-4 py-3 text-sm text-lime-200">
          Pomiar zapisany. ✅
        </div>
      )}

      {editRow ? (
        <section className="panel p-5 sm:p-7">
          <h2 className="font-extrabold text-white mb-4">
            Edytuj pomiar z {editRow.date ? new Date(editRow.date).toLocaleDateString("pl-PL") : "—"}
          </h2>
          <form
            action={updateBodyAction.bind(null, editRow.id)}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="field-label">
              Waga (kg)
              <input className="input" name="weight" type="number" step="0.1" defaultValue={editRow.weightKg ?? ""} />
            </label>
            <label className="field-label">
              Wzrost (cm)
              <input className="input" name="height" type="number" step="0.1" defaultValue={editRow.heightCm ?? ""} />
            </label>
            <label className="field-label">
              Klatka (cm)
              <input className="input" name="chest" type="number" step="0.1" defaultValue={editRow.chestCm ?? ""} />
            </label>
            <label className="field-label">
              Talia (cm)
              <input className="input" name="waist" type="number" step="0.1" defaultValue={editRow.waistCm ?? ""} />
            </label>
            <label className="field-label">
              Biodra (cm)
              <input className="input" name="hip" type="number" step="0.1" defaultValue={editRow.hipCm ?? ""} />
            </label>
            <label className="field-label">
              Udo (cm)
              <input className="input" name="thigh" type="number" step="0.1" defaultValue={editRow.thighCm ?? ""} />
            </label>
            <label className="field-label">
              Biceps (cm)
              <input className="input" name="biceps" type="number" step="0.1" defaultValue={editRow.bicepsCm ?? ""} />
            </label>
            <label className="field-label">
              Łydka (cm)
              <input className="input" name="calf" type="number" step="0.1" defaultValue={editRow.calfCm ?? ""} />
            </label>
            <label className="field-label">
              Data
              <input
                className="input"
                type="date"
                name="date"
                defaultValue={
                  editRow.date
                    ? new Date(editRow.date).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10)
                }
                required
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-3">
              <button type="submit" className="button-primary">
                Zapisz zmiany
              </button>
              <Link href="/body" className="button-secondary">
                Anuluj
              </Link>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-1">Wykresy pomiarów</h2>
        <p className="mb-4 text-sm text-slate-500">Trend każdej metryki w czasie — wybierz poniżej.</p>
        <BodyCharts rows={rows as unknown as Record<string, unknown>[]} />
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-1">Zdjęcia progresu</h2>
        <p className="mb-4 text-sm text-slate-500">Fotki sylwetki przy pomiarach — porównanie „przed/po".</p>
        <ProgressPhotos photos={photos} />
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-4">Wzrost (informacja)</h2>
        <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
          <p className="text-xs font-bold text-slate-500">Wzrost zapisany przy pierwszym pomiarze</p>
          <b className="text-2xl text-white">
            {first?.heightCm
              ? `${first.heightCm.toFixed(1)} cm`
              : latest?.heightCm
                ? `${latest.heightCm.toFixed(1)} cm`
                : "—"}
          </b>
          <p className="mt-1 text-xs text-slate-500">Wzrost nie jest brany do porównania — to stała informacja.</p>
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-4">Podsumowanie: pierwszy vs najnowszy</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.key} className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
              <p className="text-xs font-semibold text-slate-500">{m.label}</p>
              <div className="mt-3 flex items-baseline gap-3">
                <div>
                  <b className="text-lg text-white">{m.latest != null ? m.latest.toFixed(1) : "—"}</b>
                  <span className="ml-1 text-xs text-slate-500">{m.unit}</span>
                </div>
                <div className="text-xs text-slate-600">pierw. {m.first != null ? m.first.toFixed(1) : "—"}</div>
              </div>
              <div className="mt-2">
                <Trend first={m.first} latest={m.latest} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-5">Wpisy pomiarów</h2>
        {!rows.length ? (
          <div className="empty-state border-0">
            <span className="empty-icon">
              <Ruler size={30} />
            </span>
            <h3>Brak wpisów</h3>
            <p>Dodaj pierwszy pomiar, aby zacząć śledzić zmiany.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Waga</th>
                  <th>Wzrost</th>
                  <th>Klatka</th>
                  <th>Talia</th>
                  <th>Biodra</th>
                  <th>Udo</th>
                  <th>Biceps</th>
                  <th>Łydka</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-bold text-white">
                      {r.date ? new Date(r.date).toLocaleDateString("pl-PL") : "—"}
                    </td>
                    <td>{r.weightKg != null ? r.weightKg.toFixed(1) : "—"}</td>
                    <td>{r.heightCm != null ? r.heightCm.toFixed(1) : "—"}</td>
                    <td>{r.chestCm != null ? r.chestCm.toFixed(1) : "—"}</td>
                    <td>{r.waistCm != null ? r.waistCm.toFixed(1) : "—"}</td>
                    <td>{r.hipCm != null ? r.hipCm.toFixed(1) : "—"}</td>
                    <td>{r.thighCm != null ? r.thighCm.toFixed(1) : "—"}</td>
                    <td>{r.bicepsCm != null ? r.bicepsCm.toFixed(1) : "—"}</td>
                    <td>{r.calfCm != null ? r.calfCm.toFixed(1) : "—"}</td>
                    <td className="flex gap-1">
                      <Link href={`/body?edit=${r.id}`} className="button-secondary text-xs py-1 px-2">
                        Edytuj
                      </Link>
                      <DeleteMeasurementButton id={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="font-extrabold text-white mb-5">Dodaj pomiar</h2>
        <form action={saveBodyAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field-label">
            Data
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="input"
              required
            />
          </label>
          <label className="field-label">
            Waga (kg)
            <input className="input" name="weight" type="number" step="0.1" />
          </label>
          <label className="field-label">
            Wzrost (cm)
            <input className="input" name="height" type="number" step="0.1" />
          </label>
          <label className="field-label">
            Klatka (cm)
            <input className="input" name="chest" type="number" step="0.1" />
          </label>
          <label className="field-label">
            Talia (cm)
            <input className="input" name="waist" type="number" step="0.1" />
          </label>
          <label className="field-label">
            Biodra (cm)
            <input className="input" name="hip" type="number" step="0.1" />
          </label>
          <label className="field-label">
            Udo (cm)
            <input className="input" name="thigh" type="number" step="0.1" />
          </label>
          <label className="field-label">
            Biceps (cm)
            <input className="input" name="biceps" type="number" step="0.1" />
          </label>
          <label className="field-label">
            Łydka (cm)
            <input className="input" name="calf" type="number" step="0.1" />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className="button-primary">
              Zapisz pomiar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
