"use server";

import { db } from "@/db";
import { dietGoals, dietLogs, foodProducts, progressPhotos, recipes, userFavorites } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { WEEKDAYS, defaultMealName, kcalFromMacros, round1 } from "@/lib/diet";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function clamp(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(Math.round(n), min), max);
}

/** Zaokrągla z jedną cyfrą po przecinku (np. 6.1) — dla makroskładników. */
function clamp1(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(Math.round(n * 10) / 10, min), max);
}

function readMealNumber(formData: FormData): number | null {
  const raw = Number(formData.get("meal") ?? 0);
  if (!Number.isFinite(raw) || raw < 1 || raw > 12) return null;
  return Math.round(raw);
}

/** Zapisuje dzienne cele makro (i liczone z nich kcal) oraz liczbę posiłków dla każdego dnia tygodnia. */
export async function saveDietGoalsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  for (const { n } of WEEKDAYS) {
    const protein = clamp1(Number(formData.get(`protein-${n}`)) || 0, 0, 9999);
    const fat = clamp1(Number(formData.get(`fat-${n}`)) || 0, 0, 9999);
    const carbs = clamp1(Number(formData.get(`carbs-${n}`)) || 0, 0, 9999);
    const kcalGoal = kcalFromMacros(protein, fat, carbs);
    const trainingDay = String(formData.get(`training-${n}`) ?? "") === "1" ? 1 : 0;
    const meals = clamp(Number(formData.get(`meals-${n}`)) || 3, 1, 10);
    // Nazwy posiłków (JSON) — wypełnij braki domyślnymi nazwami.
    let mealNames: string[] = [];
    try {
      const raw = JSON.parse(String(formData.get(`mealNames-${n}`) ?? "[]"));
      if (Array.isArray(raw)) mealNames = raw.map((x) => String(x ?? "").trim());
    } catch {
      mealNames = [];
    }
    while (mealNames.length < meals) mealNames.push(defaultMealName(mealNames.length + 1));
    mealNames = mealNames.slice(0, meals).map((name, i) => name || defaultMealName(i + 1));
    await db
      .insert(dietGoals)
      .values({
        userId: user.id,
        weekday: n,
        protein,
        fat,
        carbs,
        kcalGoal,
        trainingDay,
        meals,
        mealNames: JSON.stringify(mealNames),
      })
      .onConflictDoUpdate({
        target: [dietGoals.userId, dietGoals.weekday],
        set: {
          protein,
          fat,
          carbs,
          kcalGoal,
          trainingDay,
          meals,
          mealNames: JSON.stringify(mealNames),
          updatedAt: new Date(),
        },
      });
  }
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

/** Dopisuje wpis spożycia — białko/tłuszcze/węglowodany, kcal liczone z makro, numer posiłku. */
export async function logDietEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "").trim();
  const protein = clamp1(Number(formData.get("protein")) || 0, 0, 9999);
  const fat = clamp1(Number(formData.get("fat")) || 0, 0, 9999);
  const carbs = clamp1(Number(formData.get("carbs")) || 0, 0, 9999);
  const kcal = kcalFromMacros(protein, fat, carbs);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!dateStr) redirect("/micha");
  await db.insert(dietLogs).values({
    userId: user.id,
    date: new Date(`${dateStr}T12:00:00`),
    protein,
    fat,
    carbs,
    kcal,
    mealNumber: readMealNumber(formData),
    note,
  });
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

export async function deleteDietLogAction(id: number): Promise<void> {
  const user = await requireUser();
  await db.delete(dietLogs).where(and(eq(dietLogs.id, id), eq(dietLogs.userId, user.id)));
  revalidatePath("/micha");
  revalidatePath("/dashboard");
}

/** Dopisuje wpis spożycia z produktu zeskanowanego z kodu kreskowego.
 *  Makro (i kcal) są już przeliczone na gramaturę po stronie klienta. */
export async function logScannedEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "").trim();
  const protein = clamp1(Number(formData.get("protein")) || 0, 0, 9999);
  const fat = clamp1(Number(formData.get("fat")) || 0, 0, 9999);
  const carbs = clamp1(Number(formData.get("carbs")) || 0, 0, 9999);
  const kcal = kcalFromMacros(protein, fat, carbs);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!dateStr) redirect("/micha");
  await db.insert(dietLogs).values({
    userId: user.id,
    date: new Date(`${dateStr}T12:00:00`),
    protein,
    fat,
    carbs,
    kcal,
    mealNumber: readMealNumber(formData),
    note,
  });
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

// ---------- Katalog produktów ----------

/** Dodaje własny produkt spożywczy (białko/tłuszcze/węglowodany + opcjonalny kod kreskowy). */
export async function addFoodProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) redirect("/micha");
  const protein = clamp1(Number(formData.get("protein")) || 0, 0, 999);
  const fat = clamp1(Number(formData.get("fat")) || 0, 0, 999);
  const carbs = clamp1(Number(formData.get("carbs")) || 0, 0, 999);
  const kcal = kcalFromMacros(protein, fat, carbs);
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  await db.insert(foodProducts).values({
    userId: user.id,
    name: name.slice(0, 255),
    barcode,
    protein,
    fat,
    carbs,
    kcal,
    isCustom: 1,
  }).onConflictDoNothing();
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}

/** Aktualizuje istniejący produkt spożywczy w katalogu użytkownika. */
export async function updateFoodProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id")) || 0;
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) redirect("/micha?saved=1");
  const protein = clamp1(Number(formData.get("protein")) || 0, 0, 999);
  const fat = clamp1(Number(formData.get("fat")) || 0, 0, 999);
  const carbs = clamp1(Number(formData.get("carbs")) || 0, 0, 999);
  const kcal = kcalFromMacros(protein, fat, carbs);
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  await db
    .update(foodProducts)
    .set({
      name: name.slice(0, 255),
      barcode,
      protein,
      fat,
      carbs,
      kcal,
    })
    .where(and(eq(foodProducts.id, id), eq(foodProducts.userId, user.id)));
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}

export async function deleteFoodProductAction(id: number): Promise<void> {
  const user = await requireUser();
  await db
    .delete(foodProducts)
    .where(and(eq(foodProducts.id, id), eq(foodProducts.userId, user.id)));
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}

/**
 * Zapisuje produkt znaleziony w Open Food Facts (przy skanowaniu) do lokalnego
 * katalogu użytkownika — dzięki temu katalog „rośnie” z każdym użyciem i
 * następnym razem produkt znajdzie się w wyszukiwarce od razu (bez czekania).
 * Ciche: nie przerywa dodawania do dziennika, gdy coś się nie powiedzie.
 */
export async function saveFoundProductAction(input: {
  code: string;
  name: string;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const code = String(input?.code ?? "").trim();
  const name = String(input?.name ?? "").trim().slice(0, 255);
  if (!code || name.length < 3) return { ok: false };
  const protein = clamp1(Number(input.protein) || 0, 0, 999);
  const fat = clamp1(Number(input.fat) || 0, 0, 999);
  const carbs = clamp1(Number(input.carbs) || 0, 0, 999);
  const kcal = Math.round(Number(input.kcal) || kcalFromMacros(protein, fat, carbs));
  try {
    // Nie twórz duplikatów we wspólnym katalogu: jeśli produkt o tym kodzie już
    // istnieje (globalny lub innego użytkownika), pomiń zapis.
    const existing = await db
      .select({ id: foodProducts.id })
      .from(foodProducts)
      .where(eq(foodProducts.barcode, code))
      .limit(1);
    if (existing.length) return { ok: false };
    await db
      .insert(foodProducts)
      .values({
        userId: user.id,
        name,
        barcode: code,
        protein,
        fat,
        carbs,
        kcal,
        isCustom: 1,
      })
      .onConflictDoNothing();
    revalidatePath("/micha");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}


// ---------- Przepisy / posiłki złożone ----------

export async function addRecipeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");
  if (name.length < 2) redirect("/micha?saved=1");
  let items: Array<{ productId: number; grams: number; name: string; protein: number; fat: number; carbs: number; kcal: number }> = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    redirect("/micha?saved=1");
  }
  const sums = items.reduce(
    (a, i) => ({
      protein: a.protein + (i.protein || 0) * ((i.grams || 0) / 100),
      fat: a.fat + (i.fat || 0) * ((i.grams || 0) / 100),
      carbs: a.carbs + (i.carbs || 0) * ((i.grams || 0) / 100),
      kcal: a.kcal + (i.kcal || 0) * ((i.grams || 0) / 100),
    }),
    { protein: 0, fat: 0, carbs: 0, kcal: 0 },
  );
  await db.insert(recipes).values({
    userId: user.id,
    name: name.slice(0, 160),
    items: JSON.stringify(items),
    protein: Math.round(sums.protein * 10) / 10,
    fat: Math.round(sums.fat * 10) / 10,
    carbs: Math.round(sums.carbs * 10) / 10,
    kcal: Math.round(sums.kcal),
  });
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}

export async function deleteRecipeAction(id: number): Promise<void> {
  const user = await requireUser();
  await db.delete(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, user.id)));
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}

// ---------- Ulubione ----------

export async function toggleFavoriteProductAction(id: number): Promise<void> {
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(userFavorites)
    .where(and(eq(userFavorites.userId, user.id), eq(userFavorites.productId, id)))
    .limit(1);
  if (existing) {
    await db.delete(userFavorites).where(eq(userFavorites.id, existing.id));
  } else {
    await db.insert(userFavorites).values({ userId: user.id, productId: id }).onConflictDoNothing();
  }
  revalidatePath("/micha");
}

// ---------- Zdjęcia progresu ----------

export async function addProgressPhotoAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const photo = String(formData.get("photo") ?? "");
  if (!photo || photo.length > 400000) redirect("/body");
  const note = String(formData.get("note") ?? "").trim() || null;
  await db.insert(progressPhotos).values({ userId: user.id, photo, note });
  revalidatePath("/body");
  redirect("/body?saved=1");
}

export async function deleteProgressPhotoAction(id: number): Promise<void> {
  const user = await requireUser();
  await db
    .delete(progressPhotos)
    .where(and(eq(progressPhotos.id, id), eq(progressPhotos.userId, user.id)));
  revalidatePath("/body");
}

// ---------- Dodanie przepisu jako wpis spożycia jednym kliknięciem ----------

export async function logRecipeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id")) || 0;
  const dateStr = String(formData.get("date") ?? "").trim();
  const mealNumber = readMealNumber(formData);
  const [recipe] = await db.select().from(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, user.id))).limit(1);
  if (!recipe) redirect("/micha?saved=1");
  await db.insert(dietLogs).values({
    userId: user.id,
    date: new Date(`${dateStr || new Date().toISOString().slice(0, 10)}T12:00:00`),
    protein: recipe.protein,
    fat: recipe.fat,
    carbs: recipe.carbs,
    kcal: recipe.kcal,
    mealNumber,
    note: recipe.name,
  });
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

// ---------- Szacowanie ze zdjęcia (AI/Gemini) — dodanie wykrytych produktów ----------

export async function logMealEstimateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dateStr = String(formData.get("date") ?? "").trim();
  const mealNumber = readMealNumber(formData);
  let items: Array<{ name: string; grams: number; protein: number; fat: number; carbs: number; kcal: number }> = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    redirect("/micha?saved=1");
  }
  if (!dateStr || !items.length) redirect("/micha?saved=1");
  for (const it of items) {
    const g = Math.max(0, Number(it.grams) || 0) / 100;
    const protein = Math.round((Number(it.protein) || 0) * g * 10) / 10;
    const fat = Math.round((Number(it.fat) || 0) * g * 10) / 10;
    const carbs = Math.round((Number(it.carbs) || 0) * g * 10) / 10;
    await db.insert(dietLogs).values({
      userId: user.id,
      date: new Date(`${dateStr}T12:00:00`),
      protein,
      fat,
      carbs,
      kcal: kcalFromMacros(protein, fat, carbs),
      mealNumber,
      note: String(it.name ?? "Posiłek").slice(0, 200),
    });
  }
  revalidatePath("/micha");
  revalidatePath("/dashboard");
  redirect("/micha?saved=1");
}

/**
 * Edycja istniejącego wpisu dziennika. Makro (B/T/W) i kcal są przeliczane
 * automatycznie: wartości w bazie traktujemy jako „na 100 g” i skalujemy
 * proporcjonalnie do nowej gramatury — dokładnie tak, jak w formularzu dodawania.
 */
export async function updateDietLogAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id")) || 0;
  const grams = Math.max(0, Number(formData.get("grams")) || 0);
  const proteinPer100 = Number(formData.get("proteinPer100")) || 0;
  const fatPer100 = Number(formData.get("fatPer100")) || 0;
  const carbsPer100 = Number(formData.get("carbsPer100")) || 0;
  const protein = round1((proteinPer100 * grams) / 100);
  const fat = round1((fatPer100 * grams) / 100);
  const carbs = round1((carbsPer100 * grams) / 100);
  const kcal = kcalFromMacros(protein, fat, carbs);
  const note = String(formData.get("note") ?? "").trim() || null;
  const mealNumber = readMealNumber(formData);
  await db
    .update(dietLogs)
    .set({ protein, fat, carbs, kcal, mealNumber, note })
    .where(and(eq(dietLogs.id, id), eq(dietLogs.userId, user.id)));
  revalidatePath("/micha");
  redirect("/micha?saved=1");
}
