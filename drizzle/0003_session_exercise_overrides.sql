ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "session_only" integer NOT NULL DEFAULT 0;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "skipped_in_session" integer NOT NULL DEFAULT 0;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "replaced_exercise_id" integer;
