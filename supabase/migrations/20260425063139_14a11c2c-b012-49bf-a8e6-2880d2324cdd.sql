CREATE TABLE public.event_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  selected_option TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_bookings_user ON public.event_bookings(user_id);
CREATE INDEX idx_event_bookings_event ON public.event_bookings(event_id);

ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event bookings"
ON public.event_bookings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own event bookings"
ON public.event_bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'active');

CREATE POLICY "Users can update own event bookings"
ON public.event_bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status IN ('active', 'cancelled'));

CREATE POLICY "Admins can view all event bookings"
ON public.event_bookings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all event bookings"
ON public.event_bookings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete event bookings"
ON public.event_bookings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_event_bookings_updated_at
BEFORE UPDATE ON public.event_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();