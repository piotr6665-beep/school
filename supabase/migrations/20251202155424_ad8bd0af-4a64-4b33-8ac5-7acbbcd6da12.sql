-- Create waitlist table for users who want to be notified when a spot opens
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  class_schedule_id uuid NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  waitlist_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  notified boolean DEFAULT false,
  UNIQUE(user_id, class_schedule_id, waitlist_date)
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist" ON public.waitlist
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can add themselves to waitlist
CREATE POLICY "Users can add to waitlist" ON public.waitlist
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves from waitlist
CREATE POLICY "Users can remove from waitlist" ON public.waitlist
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all waitlist entries
CREATE POLICY "Admins can view all waitlist" ON public.waitlist
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update waitlist (mark as notified)
CREATE POLICY "Admins can update waitlist" ON public.waitlist
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert contact messages
CREATE POLICY "Anyone can send contact message" ON public.contact_messages
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Only admins can view contact messages
CREATE POLICY "Admins can view contact messages" ON public.contact_messages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update contact messages
CREATE POLICY "Admins can update contact messages" ON public.contact_messages
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create instructors table
CREATE TABLE public.instructors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  bio text NOT NULL,
  specializations text[] DEFAULT '{}',
  image_url text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Anyone can view instructors
CREATE POLICY "Anyone can view instructors" ON public.instructors
FOR SELECT USING (true);

-- Only admins can manage instructors
CREATE POLICY "Admins can insert instructors" ON public.instructors
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update instructors" ON public.instructors
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete instructors" ON public.instructors
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create FAQ table
CREATE TABLE public.faq (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

-- Anyone can view FAQ
CREATE POLICY "Anyone can view faq" ON public.faq
FOR SELECT USING (true);

-- Only admins can manage FAQ
CREATE POLICY "Admins can insert faq" ON public.faq
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update faq" ON public.faq
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete faq" ON public.faq
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));