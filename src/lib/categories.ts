export const CATEGORIES = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Glutes",
  "Calves",
  "Core",
  "Cardio",
  "Full Body",
  "Forearms",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
