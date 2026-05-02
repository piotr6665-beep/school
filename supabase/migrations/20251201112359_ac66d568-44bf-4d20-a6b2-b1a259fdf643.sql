-- Extend class_schedules with spots management
ALTER TABLE public.class_schedules
ADD COLUMN max_spots integer NOT NULL DEFAULT 10,
ADD COLUMN available_spots integer NOT NULL DEFAULT 10;

-- Update existing records to have proper spot counts
UPDATE public.class_schedules
SET max_spots = CASE 
  WHEN spots LIKE '%Ostatnie%' THEN 3
  WHEN spots LIKE '%Lista%' THEN 0
  ELSE 10
END,
available_spots = CASE 
  WHEN spots LIKE '%Ostatnie%' THEN 3
  WHEN spots LIKE '%Lista%' THEN 0
  ELSE 10
END;

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_schedule_id uuid REFERENCES public.class_schedules(id) ON DELETE CASCADE NOT NULL,
  booking_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, class_schedule_id, booking_date)
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'active');

CREATE POLICY "Users can cancel own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update available spots
CREATE OR REPLACE FUNCTION public.update_available_spots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.class_schedules
    SET available_spots = available_spots - 1
    WHERE id = NEW.class_schedule_id AND available_spots > 0;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No available spots for this class';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    UPDATE public.class_schedules
    SET available_spots = available_spots + 1
    WHERE id = NEW.class_schedule_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.class_schedules
    SET available_spots = available_spots + 1
    WHERE id = OLD.class_schedule_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic spot updates
CREATE TRIGGER trigger_update_available_spots
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_available_spots();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;