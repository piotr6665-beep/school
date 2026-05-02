-- Add date field to class_schedules for specific date classes
ALTER TABLE public.class_schedules
ADD COLUMN date DATE;

-- Add policy to allow edge functions to insert user roles
CREATE POLICY "Service role can insert user roles"
ON public.user_roles
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add comment explaining the date field
COMMENT ON COLUMN public.class_schedules.date IS 'Optional specific date for one-time classes. If null, class repeats weekly on the specified day.';