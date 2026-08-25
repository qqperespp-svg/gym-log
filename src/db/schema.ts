import {
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  weeklyGoal: integer("weekly_goal").notNull().default(4),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    token: varchar("token", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    token: varchar("token", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("password_reset_user_idx").on(table.userId)],
);

export const exerciseDefinitions = pgTable(
  "exercise_definitions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    muscleGroup: varchar("muscle_group", { length: 60 }).notNull(),
    equipment: varchar("equipment", { length: 80 }).notNull().default("Inne"),
    isCustom: integer("is_custom").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("exercise_definitions_user_idx").on(table.userId),
    uniqueIndex("exercise_definitions_user_name_idx").on(table.userId, table.name),
  ],
);

export const workoutPrograms = pgTable(
  "workout_programs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("workout_programs_user_idx").on(table.userId)],
);

export const programExercises = pgTable(
  "program_exercises",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id")
      .notNull()
      .references(() => workoutPrograms.id, { onDelete: "cascade" }),
    exerciseDefinitionId: integer("exercise_definition_id").references(
      () => exerciseDefinitions.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 255 }).notNull(),
    position: integer("position").notNull().default(0),
    targetSets: integer("target_sets").notNull().default(3),
    targetReps: integer("target_reps").notNull().default(10),
    targetWeight: doublePrecision("target_weight").notNull().default(0),
    restSeconds: integer("rest_seconds").notNull().default(90),
  },
  (table) => [index("program_exercises_program_idx").on(table.programId)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programId: integer("program_id").references(() => workoutPrograms.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    date: timestamp("date").notNull().defaultNow(),
    notes: text("notes"),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    status: varchar("status", { length: 24 }).notNull().default("completed"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("workouts_user_date_idx").on(table.userId, table.date)],
);

export const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseDefinitionId: integer("exercise_definition_id").references(
      () => exerciseDefinitions.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 255 }).notNull(),
    position: integer("position").notNull().default(0),
    sets: integer("sets").notNull(),
    reps: integer("reps").notNull(),
    weight: doublePrecision("weight").notNull().default(0),
    restSeconds: integer("rest_seconds").notNull().default(90),
    grp: varchar("grp", { length: 8 }), // grupa superserii: A/B/C/...
  },
  (table) => [index("exercises_workout_idx").on(table.workoutId)],
);

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: serial("id").primaryKey(),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull().default(0),
    weight: doublePrecision("weight").notNull().default(0),
    rir: integer("rir"),
    note: text("note"),
    completed: integer("completed").notNull().default(0),
  },
  (table) => [
    index("exercise_sets_exercise_idx").on(table.exerciseId),
    uniqueIndex("exercise_sets_number_idx").on(table.exerciseId, table.setNumber),
  ],
);

export const bodyMeasurements = pgTable(
  "body_measurements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weightKg: integer("weight_kg"),
    heightCm: integer("height_cm"),
    chestCm: integer("chest_cm"),
    waistCm: integer("waist_cm"),
    hipCm: integer("hip_cm"),
    thighCm: integer("thigh_cm"),
    bicepsCm: integer("biceps_cm"),
    calfCm: integer("calf_cm"),
    date: timestamp("date").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("body_measurements_user_idx").on(table.userId)],
);

export const dietGoals = pgTable(
  "diet_goals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(), // 1 = poniedziałek ... 7 = niedziela
    protein: doublePrecision("protein").notNull().default(0),
    fat: doublePrecision("fat").notNull().default(0),
    carbs: doublePrecision("carbs").notNull().default(0),
    kcalGoal: doublePrecision("kcal_goal").notNull().default(0),
    trainingDay: integer("training_day").notNull().default(0), // 0 = dzień wolny, 1 = dzień treningowy
    meals: integer("meals").notNull().default(3), // liczba posiłków w danym dniu
    mealNames: text("meal_names"), // JSON: ["Śniadanie","Obiad","Kolacja",...]
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("diet_goals_user_idx").on(table.userId),
    uniqueIndex("diet_goals_user_weekday_idx").on(table.userId, table.weekday),
  ],
);

export const dietLogs = pgTable(
  "diet_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    grams: doublePrecision("grams"),
    protein: doublePrecision("protein").notNull().default(0),
    fat: doublePrecision("fat").notNull().default(0),
    carbs: doublePrecision("carbs").notNull().default(0),
    kcal: doublePrecision("kcal").notNull().default(0),
    mealNumber: integer("meal_number"), // 1..N — do którego posiłku dnia przypisany wpis
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("diet_logs_user_date_idx").on(table.userId, table.date)],
);

export const foodProducts = pgTable(
  "food_products",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // NULL = katalog globalny
    name: varchar("name", { length: 255 }).notNull(),
    barcode: varchar("barcode", { length: 64 }),
    protein: doublePrecision("protein").notNull().default(0), // na 100 g
    fat: doublePrecision("fat").notNull().default(0), // na 100 g
    carbs: doublePrecision("carbs").notNull().default(0), // na 100 g
    kcal: doublePrecision("kcal").notNull().default(0), // na 100 g
    isCustom: integer("is_custom").notNull().default(0),
    isFavorite: integer("is_favorite").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("food_products_user_idx").on(table.userId),
    index("food_products_name_idx").on(table.name),
    uniqueIndex("food_products_user_barcode_idx").on(table.userId, table.barcode),
  ],
);

export const waterLogs = pgTable(
  "water_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    liters: doublePrecision("liters").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("water_logs_user_date_idx").on(table.userId, table.date)],
);

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    items: text("items"), // JSON: [{productId, grams, name}]
    protein: doublePrecision("protein").notNull().default(0),
    fat: doublePrecision("fat").notNull().default(0),
    carbs: doublePrecision("carbs").notNull().default(0),
    kcal: doublePrecision("kcal").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("recipes_user_idx").on(table.userId)],
);

export const progressPhotos = pgTable(
  "progress_photos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull().defaultNow(),
    photo: text("photo"), // data URI (skompresowane zdjęcie)
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("progress_photos_user_idx").on(table.userId)],
);

export const userFavorites = pgTable(
  "user_favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => foodProducts.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("user_favorites_user_product_idx").on(table.userId, table.productId)],
);

export const userSettings = pgTable(
  "user_settings",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    lang: varchar("lang", { length: 8 }).notNull().default("pl"),
    theme: varchar("theme", { length: 8 }).notNull().default("dark"), // dark | light
    accent: varchar("accent", { length: 12 }).notNull().default("lime"), // kolor motywu
    waterGoal: doublePrecision("water_goal").notNull().default(2.5), // litry dziennie
    reminders: text("reminders"), // JSON: [{type:'water'|'meal', time:'12:00'}]
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

export const magicTokens = pgTable(
  "magic_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("magic_tokens_user_idx").on(table.userId)],
);

export const integrations = pgTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 24 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    scope: text("scope"),
    connectedAt: timestamp("connected_at").notNull().defaultNow(),
  },
  (table) => [index("integrations_user_idx").on(table.userId)],
);

export const fitnessLogs = pgTable(
  "fitness_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    steps: integer("steps").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("fitness_logs_user_idx").on(table.userId),
    uniqueIndex("fitness_logs_user_date_idx").on(table.userId, table.date),
  ],
);

export const sleepLogs = pgTable(
  "sleep_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(), // lokalna północ nocy, do której przypisano sen
    totalMinutes: integer("total_minutes").notNull().default(0),
    deepMinutes: integer("deep_minutes").notNull().default(0),
    lightMinutes: integer("light_minutes").notNull().default(0),
    remMinutes: integer("rem_minutes").notNull().default(0),
    awakeMinutes: integer("awake_minutes").notNull().default(0),
    asleepMinutes: integer("asleep_minutes").notNull().default(0), // sen ogólny (bez podziału)
    startAt: timestamp("start_at"), // początek snu (czas lokalny)
    endAt: timestamp("end_at"), // koniec snu
    source: varchar("source", { length: 32 }).notNull().default("google_fit"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sleep_logs_user_idx").on(table.userId),
    uniqueIndex("sleep_logs_user_date_idx").on(table.userId, table.date),
  ],
);

export type User = typeof users.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof exercises.$inferSelect;
export type WorkoutSet = typeof exerciseSets.$inferSelect;
export type ExerciseDefinition = typeof exerciseDefinitions.$inferSelect;
export type WorkoutProgram = typeof workoutPrograms.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type DietGoal = typeof dietGoals.$inferSelect;
export type DietLog = typeof dietLogs.$inferSelect;
export type FoodProduct = typeof foodProducts.$inferSelect;
export type WaterLog = typeof waterLogs.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type MagicToken = typeof magicTokens.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type FitnessLog = typeof fitnessLogs.$inferSelect;
export type SleepLog = typeof sleepLogs.$inferSelect;
