"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Droplets,
  Dumbbell,
  History,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Ruler,
  Settings,
  Sun,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { t, type Lang } from "@/lib/i18n";
import { applyTheme, type Accent, type Theme } from "@/components/theme-provider";

export function SidebarNav({
  user,
  lang,
  theme,
  accent,
}: {
  user: { name: string; email: string };
  lang: Lang;
  theme: Theme;
  accent: Accent;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Bieżący motyw/kolor — inicjowane z serwera, ale aktualizowane na kliknięcie
  // (propy z serwera są stałe i nie zmieniają się po zmianie w przeglądarce).
  const [curTheme, setCurTheme] = useState<Theme>(theme);
  const [curAccent, setCurAccent] = useState<Accent>(accent);
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") as Theme | null;
    const a = document.documentElement.getAttribute("data-accent") as Accent | null;
    if (t) setCurTheme(t);
    if (a) setCurAccent(a);
  }, []);
  function changeTheme() {
    const next: Theme = curTheme === "dark" ? "light" : "dark";
    applyTheme(next, curAccent);
    setCurTheme(next);
  }
  function changeAccent(key: Accent) {
    applyTheme(curTheme, key);
    setCurAccent(key);
  }
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const links = [
    { href: "/dashboard", label: t(lang, "nav.dashboard"), icon: LayoutDashboard },
    { href: "/workouts", label: t(lang, "nav.workouts"), icon: CalendarDays },
    { href: "/programs", label: t(lang, "nav.programs"), icon: Layers3 },
    { href: "/micha", label: t(lang, "nav.micha"), icon: UtensilsCrossed },
    { href: "/body", label: t(lang, "nav.body"), icon: Ruler },
    { href: "/nawodnienie", label: t(lang, "nav.hydration"), icon: Droplets },
    { href: "/history", label: t(lang, "nav.history"), icon: History },
    { href: "/settings", label: t(lang, "nav.settings"), icon: Settings },
  ];

  const content = (
    <>
      <div className="flex h-20 items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3 text-white" onClick={() => setOpen(false)}>
          <span className="grid size-10 place-items-center rounded-xl bg-lime-400 text-slate-950">
            <Dumbbell size={21} />
          </span>
          <span className="text-xl font-black tracking-[-0.04em]">
            GYM<span className="text-lime-400">RAT</span>
          </span>
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Zamknij menu">
          <X />
        </button>
      </div>
      <div className="mx-5 mt-3 rounded-2xl border border-white/8 bg-white/[.035] p-3">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-500 text-xs font-black text-slate-950">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <Link
          href="/workouts/new"
          onClick={() => setOpen(false)}
          className="button-primary w-full justify-center py-2.5 text-sm"
        >
          <Plus size={17} /> {t(lang, "nav.newWorkout")}
        </Link>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-5 py-7">
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-600">
          {lang === "en" ? "Navigation" : "Nawigacja"}
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => router.prefetch(href)}
              onFocus={() => router.prefetch(href)}
              onClick={() => setOpen(false)}
              className={`nav-link ${active ? "nav-link-active" : ""}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {active && <span className="ml-auto size-1.5 rounded-full bg-current" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 p-5">
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-white/[.04] px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={changeTheme}
              className="grid size-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
              title={curTheme === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
              aria-label="Przełącz motyw jasny/ciemny"
            >
              {curTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
          <div className="flex items-center gap-1">
            {(
              [
                ["lime", "#a3e635"],
                ["sky", "#38bdf8"],
                ["violet", "#a78bfa"],
                ["rose", "#fb7185"],
                ["amber", "#fbbf24"],
                ["emerald", "#34d399"],
              ] as const
            ).map(([key, color]) => (
              <button
                key={key}
                type="button"
                onClick={() => changeAccent(key)}
                className={`size-5 rounded-full transition ${curAccent === key ? "ring-2 ring-white/70" : "hover:scale-110"}`}
                style={{ backgroundColor: color }}
                title={`Kolor motywu: ${key}`}
                aria-label={`Kolor motywu: ${key}`}
              />
            ))}
          </div>
        </div>
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-lime-400/5 px-3 py-3 text-xs text-slate-400">
          <ChartNoAxesColumnIncreasing className="text-lime-400" size={19} />
          <span>
            <b className="block text-white">Tryb bestii</b>
            Każda seria ma znaczenie
          </span>
        </div>
        <form action={logoutAction}>
          <button className="nav-link w-full">
            <LogOut size={18} /> {t(lang, "nav.logout")}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 grid size-11 place-items-center rounded-xl border border-white/10 bg-slate-900 text-white shadow-xl lg:hidden"
        aria-label="Otwórz menu"
      >
        <Menu />
      </button>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/[.06] bg-[#090d12] lg:flex">
        {content}
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="flex h-full w-[84%] max-w-72 flex-col border-r border-white/10 bg-[#090d12]"
            onClick={(event) => event.stopPropagation()}
          >
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
