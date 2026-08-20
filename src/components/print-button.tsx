"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Drukuj / Zapisz PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="button-primary">
      <Printer size={17} /> {label}
    </button>
  );
}
