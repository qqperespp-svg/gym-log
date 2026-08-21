// Lekki słownik PL/EN. Tłumaczy najważniejsze elementy interfejsu.
const dict = {
  pl: {
    "nav.dashboard": "Dashboard",
    "nav.workouts": "Harmonogram treningów",
    "nav.programs": "Plany treningowe",
    "nav.exercises": "Ćwiczenia",
    "nav.body": "Ciało",
    "nav.micha": "Micha",
    "nav.sleep": "Sen",
    "nav.hydration": "Nawodnienie",
    "nav.history": "Historia",
    "nav.settings": "Ustawienia",
    "nav.newWorkout": "Nowy trening",
    "nav.logout": "Wyloguj się",
    "common.save": "Zapisz",
    "common.cancel": "Anuluj",
    "common.add": "Dodaj",
    "common.delete": "Usuń",
    "common.edit": "Edytuj",
    "common.search": "Szukaj",
    "common.back": "Wróć",
    "common.saved": "Zapisano. ✅",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.workouts": "Workout schedule",
    "nav.programs": "Training plans",
    "nav.exercises": "Exercises",
    "nav.body": "Body",
    "nav.micha": "Food",
    "nav.sleep": "Sleep",
    "nav.hydration": "Hydration",
    "nav.history": "History",
    "nav.settings": "Settings",
    "nav.newWorkout": "New workout",
    "nav.logout": "Log out",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.add": "Add",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.search": "Search",
    "common.back": "Back",
    "common.saved": "Saved. ✅",
  },
} as const;

export type Lang = "pl" | "en";
export type DictKey = keyof (typeof dict)["pl"];

export function t(lang: Lang, key: DictKey): string {
  return dict[lang]?.[key] ?? dict.pl[key];
}

/** Domyślna nazwa posiłku wg pory dnia (1-5). */
export function suggestMealByHour(hour = new Date().getHours()): number {
  if (hour < 10) return 1; // śniadanie
  if (hour < 13) return 2; // drugie śniadanie
  if (hour < 17) return 3; // obiad
  if (hour < 20) return 4; // podwieczorek
  return 5; // kolacja
}
