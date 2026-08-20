"use client";

import { useEffect, useRef } from "react";
import { Link2 } from "lucide-react";
import { syncGoogleFitAction } from "@/actions/integrations";

/** Formularz synchronizacji Google Fit w Ustawieniach.
 *  Przekazuje przesunięcie strefy czasowej przeglądarki (pole `tz`), aby daty
 *  dni zapisywane były w tej samej konwencji co sync z dashboardu (lokalne
 *  południe) — inaczej te same dni zapisywałyby się pod dwoma timestampami
 *  i kafelek kroków sumował je podwójnie. */
export function GoogleFitSyncForm() {
  const tzRef = useRef<string>("0");
  useEffect(() => {
    tzRef.current = String(-new Date().getTimezoneOffset());
  }, []);
  return (
    <form action={syncGoogleFitAction}>
      <input type="hidden" name="tz" value={tzRef.current} />
      <button type="submit" className="button-primary px-4 py-2 text-sm">
        <Link2 size={15} /> Zsynchronizuj
      </button>
    </form>
  );
}
