-- Add RLS policies for managing class schedules
-- Note: This allows any authenticated user to manage schedules
-- For production, consider implementing a proper role-based system

CREATE POLICY "Authenticated users can insert schedules"
ON public.class_schedules
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedules"
ON public.class_schedules
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete schedules"
ON public.class_schedules
FOR DELETE
TO authenticated
USING (true);

-- Add similar policies for passes table
CREATE POLICY "Authenticated users can insert passes"
ON public.passes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update passes"
ON public.passes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete passes"
ON public.passes
FOR DELETE
TO authenticated
USING (true);