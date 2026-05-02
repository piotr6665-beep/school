ALTER TABLE public.class_schedules
ADD COLUMN badge TEXT;

ALTER TABLE public.class_schedules
ADD CONSTRAINT class_schedules_badge_check
CHECK (badge IS NULL OR badge IN ('new', 'recommended'));