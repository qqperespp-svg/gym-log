import { db } from "@/db";
import { foodProducts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function seedFoodProducts() {
  const products = [
    { barcode: "5900491000016", name: "Mleko UHT 2%", protein: 3.2, fat: 2.0, carbs: 4.7, kcal: 47 },
    { barcode: "5900491000023", name: "Jogurt naturalny 2%", protein: 3.6, fat: 2.0, carbs: 6.0, kcal: 60 },
    { barcode: "5900491000030", name: "Chleb żytni", protein: 7.0, fat: 1.5, carbs: 45.0, kcal: 230 },
    { barcode: "5900491000047", name: "Ser żółty gouda", protein: 25.0, fat: 28.0, carbs: 0.0, kcal: 356 },
    { barcode: "5900491000054", name: "Masło 82% tłuszczu", protein: 0.5, fat: 81.0, carbs: 0.5, kcal: 717 },
    { barcode: "5900491000061", name: "Jajko kurze (średnie)", protein: 13.0, fat: 11.0, carbs: 1.0, kcal: 155 },
    { barcode: "5900491000078", name: "Płatki owsiane górskie", protein: 13.0, fat: 7.0, carbs: 66.0, kcal: 389 },
    { barcode: "5900491000085", name: "Ryż biały długi", protein: 7.0, fat: 1.0, carbs: 78.0, kcal: 365 },
    { barcode: "5900491000092", name: "Pierś z kurczaka (surowa)", protein: 31.0, fat: 3.6, carbs: 0.0, kcal: 165 },
    { barcode: "5900491000108", name: "Twaróg półtłusty", protein: 18.0, fat: 4.0, carbs: 3.5, kcal: 98 },
    { barcode: "5900491000115", name: "Banan", protein: 1.1, fat: 0.3, carbs: 23.0, kcal: 89 },
    { barcode: "5900491000122", name: "Jabłko (średnie)", protein: 0.3, fat: 0.2, carbs: 14.0, kcal: 52 },
  ];

  for (const p of products) {
    const existing = await db
      .select({ id: foodProducts.id })
      .from(foodProducts)
      .where(eq(foodProducts.barcode, p.barcode))
      .limit(1);

    if (!existing.length) {
      await db.insert(foodProducts).values({
        userId: null,
        name: p.name,
        barcode: p.barcode,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        kcal: p.kcal,
        isCustom: 0,
        isFavorite: 0,
      });
    }
  }

  console.log(`Dodano / pominięto ${products.length} produktów.`);
}
