-- Fix room_inspections table:
-- 1. Change score constraints from 1-5 to 1-10 (UI uses 1-10 scale)
-- 2. Fix inspector_id FK to reference public.users instead of auth.users

-- Drop old score constraints
ALTER TABLE public.room_inspections
  DROP CONSTRAINT IF EXISTS room_inspections_cleanliness_score_check,
  DROP CONSTRAINT IF EXISTS room_inspections_maintenance_score_check,
  DROP CONSTRAINT IF EXISTS room_inspections_amenities_score_check,
  DROP CONSTRAINT IF EXISTS room_inspections_overall_score_check;

-- Add new 1-10 constraints
ALTER TABLE public.room_inspections
  ADD CONSTRAINT room_inspections_cleanliness_score_check CHECK (cleanliness_score BETWEEN 1 AND 10),
  ADD CONSTRAINT room_inspections_maintenance_score_check CHECK (maintenance_score BETWEEN 1 AND 10),
  ADD CONSTRAINT room_inspections_amenities_score_check   CHECK (amenities_score BETWEEN 1 AND 10),
  ADD CONSTRAINT room_inspections_overall_score_check     CHECK (overall_score BETWEEN 1 AND 10);

-- Fix inspector_id FK: drop old ref to auth.users, point to public.users
ALTER TABLE public.room_inspections
  DROP CONSTRAINT IF EXISTS room_inspections_inspector_id_fkey;

ALTER TABLE public.room_inspections
  ADD CONSTRAINT room_inspections_inspector_id_fkey
  FOREIGN KEY (inspector_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Scale existing scores if any are stored as 1-5 (multiply by 2 to convert to 1-10 scale)
UPDATE public.room_inspections
SET
  cleanliness_score = LEAST(10, cleanliness_score * 2),
  maintenance_score = LEAST(10, maintenance_score * 2),
  amenities_score   = LEAST(10, amenities_score * 2),
  overall_score     = LEAST(10, overall_score * 2)
WHERE cleanliness_score <= 5 AND cleanliness_score >= 1;
