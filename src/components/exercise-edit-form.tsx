"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Save } from "lucide-react";
import type { ExerciseFormState } from "@/actions/exercises";
import { SubmitButton } from "@/components/submit-button";

const muscleGroups = [
  "Klatka",
  "Plecy",
  "Nogi",
  "Pośladki",
  "Łydki",
  "Barki",
  "Biceps",
  "Triceps",
  "Brzuch",
  "Przedramiona",
  "Całe ciało",
  "Cardio",
  "Mobilność",
];
const equipment = [
  "Sztanga",
  "Hantle",
  "Maszyna",
  "Wyciąg",
  "Drążek",
  "Kettlebell",
  "Masa ciała",
  "Gumy",
  "Obciążenie",
  "Inne",
];

export function ExerciseEditForm({
  exercise,
  action,
}: {
  exercise: { name: string; muscleGroup: string; equipment: string };
  action: (state: ExerciseFormState, formData: FormData) => Promise<ExerciseFormState>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="panel max-w-2xl space-y-5 p-6 sm:p-8">
      <label className="field-label">
        Nazwa
        <input className="input" name="name" defaultValue={exercise.name} required />
      </label>
      <label className="field-label">
        Partia mięśniowa
        <select className="input" name="muscleGroup" defaultValue={exercise.muscleGroup}>
          {muscleGroups.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Sprzęt
        <select className="input" name="equipment" defaultValue={exercise.equipment}>
          {equipment.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      {state?.error && (
        <p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">{state.error}</p>
      )}
      <div className="flex justify-end gap-3">
        <Link href="/exercises" className="button-secondary">
          Anuluj
        </Link>
        <SubmitButton>
          <Save size={17} /> Zapisz zmiany
        </SubmitButton>
      </div>
    </form>
  );
}
