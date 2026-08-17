import { pgTable, serial, text, integer, timestamp, real, boolean, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  notes: text("notes"),
  date: timestamp("date").notNull().defaultNow(),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutExercises = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").notNull(),
});

export const sets = pgTable("sets", {
  id: serial("id").primaryKey(),
  workoutExerciseId: integer("workout_exercise_id").notNull().references(() => workoutExercises.id, { onDelete: "cascade" }),
  reps: integer("reps").notNull(),
  weight: real("weight").notNull(),
  rir: integer("rir"),
  completed: boolean("completed").notNull().default(true),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const programExercises = pgTable("program_exercises", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
});

export const bodyMeasurements = pgTable("body_measurements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  chestCm: numeric("chest_cm", { precision: 5, scale: 1 }),
  waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
  hipCm: numeric("hip_cm", { precision: 5, scale: 1 }),
  thighCm: numeric("thigh_cm", { precision: 5, scale: 1 }),
  bicepsCm: numeric("biceps_cm", { precision: 5, scale: 1 }),
  calfCm: numeric("calf_cm", { precision: 5, scale: 1 }),
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userRelations = relations(users, ({ many }) => ({
  workouts: many(workouts),
  exercises: many(exercises),
  programs: many(programs),
  bodyMeasurements: many(bodyMeasurements),
}));

export const workoutRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, { fields: [workouts.userId], references: [users.id] }),
  workoutExercises: many(workoutExercises),
}));

export const exerciseRelations = relations(exercises, ({ one, many }) => ({
  user: one(users, { fields: [exercises.userId], references: [users.id] }),
  workoutExercises: many(workoutExercises),
  programExercises: many(programExercises),
}));

export const workoutExerciseRelations = relations(workoutExercises, ({ one, many }) => ({
  workout: one(workouts, { fields: [workoutExercises.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutExercises.exerciseId], references: [exercises.id] }),
  sets: many(sets),
}));

export const setRelations = relations(sets, ({ one }) => ({
  workoutExercise: one(workoutExercises, { fields: [sets.workoutExerciseId], references: [workoutExercises.id] }),
}));

export const programRelations = relations(programs, ({ one, many }) => ({
  user: one(users, { fields: [programs.userId], references: [users.id] }),
  programExercises: many(programExercises),
}));

export const programExerciseRelations = relations(programExercises, ({ one }) => ({
  program: one(programs, { fields: [programExercises.programId], references: [programs.id] }),
  exercise: one(exercises, { fields: [programExercises.exerciseId], references: [exercises.id] }),
}));

export const bodyMeasurementRelations = relations(bodyMeasurements, ({ one }) => ({
  user: one(users, { fields: [bodyMeasurements.userId], references: [users.id] }),
}));
