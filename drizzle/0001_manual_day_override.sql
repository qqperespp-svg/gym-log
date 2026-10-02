ALTER TABLE "diet_goals"
ADD COLUMN IF NOT EXISTS "manual_day_override" integer NOT NULL DEFAULT 0;
