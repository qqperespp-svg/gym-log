"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel = "Zapisywanie…", className = "button-primary" }: { children: React.ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <LoaderCircle size={17} className="animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
