"use client";

import { useTransition } from "react";
import { LoaderCircle, Repeat } from "lucide-react";
import { cloneWorkoutAction } from "@/actions/workouts";

export function PlanAgainButton({
  workoutId,
  variant = "secondary",
  className = "",
}: {
  workoutId: number;
  variant?: "primary" | "secondary" | "compact";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const base =
    variant === "primary"
      ? "button-primary"
      : variant === "compact"
        ? "button-secondary px-3 py-1.5 text-xs"
        : "button-secondary";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          await cloneWorkoutAction(workoutId);
        });
      }}
      className={`${base} justify-center ${className}`}
    >
      {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Repeat size={16} />}
      {pending ? "Planuję…" : "Zaplanuj ponownie"}
    </button>
  );
}
