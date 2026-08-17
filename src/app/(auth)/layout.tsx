import { Activity, ChartNoAxesColumnIncreasing, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#080b0f] lg:grid lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden border-r border-white/[.06] lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
      <div className="auth-grid absolute inset-0 opacity-40" />
      <div className="absolute -left-32 top-1/3 size-[420px] rounded-full bg-lime-400/10 blur-[120px]" />
      <div className="relative z-10 max-w-xl pt-16"><p className="mb-6 text-xs font-black uppercase tracking-[.28em] text-lime-400">Trenuj. Zapisuj. Progresuj.</p><h2 className="text-5xl font-black leading-[1.04] tracking-[-.055em] text-white xl:text-6xl">Twój progres<br />nie jest dziełem<br /><span className="text-lime-400">przypadku.</span></h2><p className="mt-7 max-w-md text-base leading-7 text-slate-400">Każda seria, kilogram i rekord w jednym miejscu. Skup się na treningu — liczby zostaw nam.</p></div>
      <div className="relative z-10 grid grid-cols-3 gap-3">
        {[{ icon: Activity, value: "100%", label: "Twoich danych" }, { icon: ChartNoAxesColumnIncreasing, value: "24/7", label: "Wgląd w progres" }, { icon: ShieldCheck, value: "SAFE", label: "Prywatne konto" }].map(({ icon: Icon, value, label }) => <div key={label} className="rounded-2xl border border-white/[.07] bg-white/[.03] p-4 backdrop-blur"><Icon className="mb-4 text-lime-400" size={20} /><b className="block text-lg text-white">{value}</b><span className="text-[11px] text-slate-500">{label}</span></div>)}
      </div>
    </section>
    <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">{children}</section>
  </main>;
}
