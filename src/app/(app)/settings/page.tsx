import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Bell, CheckCircle2, Download, Languages, Palette } from "lucide-react";
import { db } from "@/db";
import { fitnessLogs, integrations, userSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { exportDataAction, saveSettingsAction, saveTdeeAction } from "@/actions/settings";
import { disconnectGoogleFitAction } from "@/actions/integrations";
import { Activity, Link2, Unlink } from "lucide-react";
import { ImportForm } from "@/components/import-form";
import { GoogleFitSyncForm } from "@/components/google-fit-sync-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; fit_error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1);
  const lang = settings?.lang === "en" ? "en" : "pl";
  const themeSetting = settings?.theme === "light" ? "light" : "dark";
  const [gfit, stepsRows] = await Promise.all([
    db.select().from(integrations).where(eq(integrations.userId, user.id)).limit(1),
    db.select().from(fitnessLogs).where(eq(fitnessLogs.userId, user.id)).orderBy(desc(fitnessLogs.date)).limit(1),
  ]);
  const googleFit = gfit[0] ?? null;
  const lastSteps = stepsRows[0] ?? null;
  const accentSetting = settings?.accent ?? "lime";
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
          <Palette size={18} className="text-lime-400" /> {lang === "en" ? "Theme / Motyw" : "Motyw i kolor"}
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Motyw zapisany tu jest stały dla każdego urządzenia. Przełącznik w menu bocznym działa
          natychmiast (zapis na tym urządzeniu).
        </p>
        <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="waterGoal" value={waterGoal} />
          {reminders.map((r, i) => (
            <input key={i} type="hidden" name={`reminder${i + 1}`} value={r} />
          ))}
          <label className="field-label">
            Motyw
            <select className="input" name="theme" defaultValue={themeSetting}>
              <option value="dark">Ciemny</option>
              <option value="light">Jasny</option>
            </select>
          </label>
          <label className="field-label">
            Kolor motywu
            <select className="input" name="accent" defaultValue={accentSetting}>
              {(
                [
                  ["lime", "Limonkowy"],
                  ["sky", "Błękitny"],
                  ["violet", "Fioletowy"],
                  ["rose", "Różowy"],
                  ["amber", "Bursztynowy"],
                  ["emerald", "Szmaragdowy"],
                ] as const
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="button-primary">Zapisz motyw</button>
          </div>
        </form>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <Activity size={18} className="text-lime-400" /> Integracje
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Podłącz urządzenia i aplikacje zdrowotne, żeby dane trafiały do GYMRAT automatycznie.
        </p>
        {params.fit_error === "1" && (
          <p className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
            Nie udało się połączyć Google Fit — sprawdź zmienne GOOGLE_FIT_CLIENT_ID / GOOGLE_FIT_CLIENT_SECRET w Vercel.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white/[.05] text-slate-300">F</span>
                <div>
                  <b className="block text-sm font-extrabold text-white">Google Fit</b>
                  <p className="text-xs text-slate-500">Kroki i waga — synchronizacja ręczna</p>
                </div>
              </div>
              {googleFit ? (
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Połączono
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {lastSteps
                ? `Ostatnia synchronizacja: ${lastSteps.steps.toLocaleString("pl-PL")} kroków (${lastSteps.date.toLocaleDateString("pl-PL")})`
                : googleFit
                  ? "Brak danych — kliknij „Zsynchronizuj”."
                  : "Połącz, aby importować kroki i wagę z aplikacji Google Fit / Health Connect."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {googleFit ? (
                <>
                  <GoogleFitSyncForm />
                  <form action={disconnectGoogleFitAction}>
                    <button type="submit" className="button-secondary px-4 py-2 text-sm">
                      <Unlink size={15} /> Rozłącz
                    </button>
                  </form>
                </>
              ) : (
                <a href="/api/integrations/gfit/auth" className="button-primary px-4 py-2 text-sm">
                  <Link2 size={15} /> Połącz Google Fit
                </a>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white/[.05] text-slate-300">Mi</span>
              <div>
                <b className="block text-sm font-extrabold text-white">Mi Fitness (Xiaomi)</b>
                <p className="text-xs text-slate-500">Zegarki i opaski Xiaomi</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Xiaomi nie udostępnia publicznego API dla Mi Fitness. Najłatwiej: w aplikacji Mi Fitness
              włącz synchronizację z <b>Google Fit / Health Connect</b>, a dane (kroki, waga) pobierzesz
              tu przez integrację Google Fit obok.
            </p>
            <p className="mt-2 text-xs leading-5 text-lime-300/90">
              Kroki: pokazywana jest <b>najświeższa dostępna wartość</b> (opaska Mi Fitness lub
              estymata Google — <b>nigdy nie sumowane</b>). Aby opaska wysłała najnowsze kroki,
              otwórz aplikację Mi Fitness — Gymrat zsynchronizuje się automatycznie po powrocie.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
