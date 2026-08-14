"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ChartNoAxesColumnIncreasing, Dumbbell, History, Layers3, LayoutDashboard, LibraryBig, LogOut, Menu, Plus, X } from "lucide-react";
import { logoutAction } from "@/actions/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts", label: "Treningi", icon: CalendarDays },
  { href: "/programs", label: "Programy", icon: Layers3 },
  { href: "/exercises", label: "Ćwiczenia", icon: LibraryBig },
  { href: "/history", label: "Historia", icon: History },
];

export function SidebarNav({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const content = (
    <>
      <div className="flex h-20 items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3 text-white" onClick={() => setOpen(false)}>
          <span className="grid size-10 place-items-center rounded-xl bg-lime-400 text-slate-950"><Dumbbell size={21} /></span>
          <span className="text-xl font-black tracking-[-0.04em]">GYM<span className="text-lime-400">RAT</span></span>
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Zamknij menu"><X /></button>
      </div>
      <div className="mx-5 mt-3 rounded-2xl border border-white/8 bg-white/[.035] p-3">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-500 text-xs font-black text-slate-950">{initials}</span>
          <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
        </div>
        <Link href="/workouts/new" onClick={() => setOpen(false)} className="button-primary w-full justify-center py-2.5 text-sm"><Plus size={17} /> Nowy trening</Link>
      </div>
      <nav className="flex-1 space-y-1 px-5 py-7">
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-slate-600">Nawigacja</p>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} onClick={() => setOpen(false)} className={`nav-link ${active ? "nav-link-active" : ""}`}><Icon size={19} /><span>{label}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-lime-400" />}</Link>;
        })}
      </nav>
      <div className="border-t border-white/5 p-5">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-lime-400/5 px-3 py-3 text-xs text-slate-400"><ChartNoAxesColumnIncreasing className="text-lime-400" size={19} /><span><b className="block text-white">Tryb bestii</b>Każda seria ma znaczenie</span></div>
        <form action={logoutAction}><button className="nav-link w-full"><LogOut size={18} /> Wyloguj się</button></form>
      </div>
    </>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-40 grid size-11 place-items-center rounded-xl border border-white/10 bg-slate-900 text-white shadow-xl lg:hidden" aria-label="Otwórz menu"><Menu /></button>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/[.06] bg-[#090d12] lg:flex">{content}</aside>
      {open && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-[84%] max-w-72 flex-col border-r border-white/10 bg-[#090d12]" onClick={(event) => event.stopPropagation()}>{content}</aside></div>}
    </>
  );
}
