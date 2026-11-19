ALTER TABLE "body_measurements"
  ALTER COLUMN "weight_kg" TYPE double precision USING "weight_kg"::double precision,
  ALTER COLUMN "height_cm" TYPE double precision USING "height_cm"::double precision,
  ALTER COLUMN "chest_cm" TYPE double precision USING "chest_cm"::double precision,
  ALTER COLUMN "waist_cm" TYPE double precision USING "waist_cm"::double precision,
  ALTER COLUMN "hip_cm" TYPE double precision USING "hip_cm"::double precision,
  ALTER COLUMN "thigh_cm" TYPE double precision USING "thigh_cm"::double precision,
  ALTER COLUMN "biceps_cm" TYPE double precision USING "biceps_cm"::double precision,
  ALTER COLUMN "calf_cm" TYPE double precision USING "calf_cm"::double precision;
