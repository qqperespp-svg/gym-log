import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Dumbbell, FileDown, Layers3, Ruler, UtensilsCrossed } from "lucide-react";
import { db } from "@/db";
import { workoutPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function ReportCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof FileDown;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-2xl border border-white/[.07] bg-black/15 p-4 transition hover:border-lime-400/25 hover:bg-lime-400/[.04]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lime-400/10 text-lime-400">
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <span className="button-secondary self-center px-3 py-1.5 text-xs">
        <FileDown size={14} /> PDF
      </span>
    </Link>
  );
}

export default async function ReportsPage() {
  const user = await requireUser();
  const programs = await db
    .select({ id: workoutPrograms.id, name: workoutPrograms.name })
    .from(workoutPrograms)
    .where(eq(workoutPrograms.userId, user.id))
    .orderBy(asc(workoutPrograms.name));

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Wydruki i PDF</p>
        <h1 className="page-title">Raporty</h1>
        <p className="mt-2 text-sm text-slate-500">
          Wszystkie raporty w jednym miejscu — trening, Micha i ciało.
        </p>
      </header>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <Dumbbell size={18} className="text-lime-400" /> Trening
        </h2>
        <p className="mb-5 text-sm text-slate-500">Historia sesji i plany treningowe do wydruku.</p>
        <div className="space-y-3">
          <ReportCard
            href="/workouts/print"
            title="Historia treningów"
            description="Ukończone sesje, ćwiczenia i serie — z filtrem dat."
            icon={Dumbbell}
          />
          {programs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-500">
              Nie masz jeszcze planów. Utwórz je w{" "}
              <Link href="/programs" className="font-bold text-lime-400 hover:underline">
                Planach treningowych
              </Link>
              , a ich PDF pojawi się tutaj.
            </p>
          ) : (
            programs.map((program) => (
              <ReportCard
                key={program.id}
                href={`/programs/${program.id}/print`}
                title={program.name}
                description="Wydruk planu treningowego (ćwiczenia i założone serie)."
                icon={Layers3}
              />
            ))
          )}
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <UtensilsCrossed size={18} className="text-lime-400" /> Micha
        </h2>
        <p className="mb-5 text-sm text-slate-500">Dziennik posiłków, makro i kalorie.</p>
        <ReportCard
          href="/micha/print"
          title="Raport żywienia"
          description="Wpisy spożycia, cele makro i kalorie — z filtrem dat."
          icon={UtensilsCrossed}
        />
      </section>

      <section className="panel p-5 sm:p-7">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold text-white">
          <Ruler size={18} className="text-lime-400" /> Ciało
        </h2>
        <p className="mb-5 text-sm text-slate-500">Pomiary sylwetki ze zdjęciami z tej samej daty.</p>
        <ReportCard
          href="/body/print"
          title="Pomiary i zdjęcia progresu"
          description="Waga, obwody i fotki dopasowane do daty wpisu."
          icon={Ruler}
        />
      </section>
    </div>
  );
}
