import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, Bell, Calculator, CheckCircle2, Download, Languages } from "lucide-react";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { exportDataAction, saveSettingsAction, saveTdeeAction } from "@/actions/settings";
import { TdeeCalculator } from "@/components/tdee-calculator";
import { ImportForm } from "@/components/import-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
  const lang = settings?.lang === "en" ? "en" : "pl";
  const waterGoal = settings?.waterGoal ?? 2.5;
  let reminders: string[] = [];
  try {
    reminders = settings?.reminders ? JSON.parse(settings.reminders) : [];
  } catch {
    reminders = [];
  }
  while (reminders.length < 4) reminders.push("");

  return (
    <div className="space-y-7">
      <header>
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
          <ArrowLeft size={16} /> {lang === "en" ? "Back to dashboard" : "Wróć do dashboardu"}
        </Link>
        <p className="eyebrow">Settings / Ustawienia</p>
        <h1 className="page-title">{lang === "en" ? "Settings" : "Ustawienia"}</h1>
      </header>

      {params.saved === "1" && (
        <div className="flex items-center gap-3 rounded-xl border border-lime-400/20 bg-lime-400/[.08] px-4 py-3 text-sm font-bold text-lime-200">
          <CheckCircle2 size={18} /> Zapisano. ✅
        </div>
      )}
      {params.error === "1" && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          Nie udało się zaimportować danych — plik JSON jest niepoprawny.
        </div>
      )}

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <Languages size={18} className="text-lime-400" /> {lang === "en" ? "Language / Język" : "Język"}
        </h2>
        <form action={saveSettingsAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="lang" value={lang === "en" ? "pl" : "en"} />
          <input type="hidden" name="waterGoal" value={waterGoal} />
          {reminders.map((r, i) => (
            <input key={i} type="hidden" name={`reminder${i + 1}`} value={r} />
          ))}
          <button type="submit" className="button-secondary justify-center">
            {lang === "en" ? "Przełącz na polski" : "Switch to English"}
          </button>
        </form>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <Bell size={18} className="text-lime-400" /> {lang === "en" ? "Reminders / Przypomnienia" : "Przypomnienia"}
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Godziny przypomnień (woda / posiłek). Działają w przeglądarce i PWA, gdy aplikacja jest otwarta.
        </p>
        <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="waterGoal" value={waterGoal} />
          {[1, 2, 3, 4].map((i) => (
            <label key={i} className="field-label">
              {i === 1 ? "Przypomnienie 1" : `Przypomnienie ${i}`}
              <input className="input" type="time" name={`reminder${i}`} defaultValue={reminders[i - 1] ?? ""} />
            </label>
          ))}
          <div className="sm:col-span-2">
            <button type="submit" className="button-primary">Zapisz przypomnienia</button>
          </div>
        </form>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <Download size={18} className="text-lime-400" /> {lang === "en" ? "Backup / Kopia zapasowa" : "Kopia zapasowa"}
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Eksport całych danych (pomiary, dieta, cele, woda, treningi) do pliku JSON albo przywrócenie z kopii.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/export" className="button-primary">
            <Download size={17} /> Pobierz kopię (JSON)
          </a>
          <ImportForm />
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <Calculator size={18} className="text-lime-400" /> {lang === "en" ? "TDEE calculator / Kalkulator kalorii" : "Kalkulator zapotrzebowania (TDEE)"}
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Wylicza dzienne zapotrzebowanie i zapisuje cele makro/kcal dla wszystkich dni tygodnia.
        </p>
        <TdeeCalculator />
      </section>
    </div>
  );
}
