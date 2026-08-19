"use client";

import { useEffect } from "react";

export type Theme = "dark" | "light";
export type Accent = "lime" | "sky" | "violet" | "rose" | "amber" | "emerald";

const KEY = "gymrat:theme";

/** Nakłada motyw i kolor akcentu na <html>. Zapis użytkownika z bazy ma pierwszeństwo
 *  przy pierwszym renderze; potem lokalny wybór (localStorage) nadpisuje od razu. */
export function ThemeProvider({ theme, accent }: { theme: Theme; accent: Accent }) {
  useEffect(() => {
    const root = document.documentElement;
    let t: Theme = theme;
    let a: Accent = accent;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { theme?: Theme; accent?: Accent };
        if (parsed.theme) t = parsed.theme;
        if (parsed.accent) a = parsed.accent;
      }
    } catch {
      // ignoruj
    }
    root.setAttribute("data-theme", t);
    root.setAttribute("data-accent", a);
  }, [theme, accent]);
  return null;
}

/** Zapisuje motyw w localStorage i natychmiast nakłada na <html>. */
export function applyTheme(theme: Theme, accent: Accent) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ theme, accent }));
  } catch {
    // ignoruj
  }
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-accent", accent);
}
