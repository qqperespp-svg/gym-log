"use client";

import Link from "next/link";
import { BarChart3, Dumbbell, Ellipsis, LayoutDashboard, UtensilsCrossed } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Start", icon: LayoutDashboard },
  { href: "/workouts", label: "Trening", icon: Dumbbell },
  { href: "/micha", label: "Micha", icon: UtensilsCrossed },
  { href: "/history", label: "Postępy", icon: BarChart3 },
  { href: "/settings", label: "Więcej", icon: Ellipsis },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[.08] bg-[#0b0f14]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,.25)] backdrop-blur-lg lg:hidden" aria-label="Główna nawigacja">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold transition ${active ? "bg-lime-400/10 text-lime-300" : "text-slate-500 hover:text-slate-200"}`}>
          <Icon size={18} strokeWidth={active ? 2.5 : 2} />
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  );
}
