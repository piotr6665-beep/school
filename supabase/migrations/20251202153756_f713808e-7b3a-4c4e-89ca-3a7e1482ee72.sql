-- Add quantity column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN quantity integer NOT NULL DEFAULT 1;

-- Add check constraint to ensure quantity is positive
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_quantity_positive CHECK (quantity > 0 AND quantity <= 10);

-- Update the trigger function to handle quantity
CREATE OR REPLACE FUNCTION public.update_available_spots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.class_schedules
    SET available_spots = available_spots - NEW.quantity
    WHERE id = NEW.class_schedule_id AND available_spots >= NEW.quantity;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not enough available spots for this class';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    UPDATE public.class_schedules
    SET available_spots = available_spots + OLD.quantity
    WHERE id = NEW.class_schedule_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.class_schedules
    SET available_spots = available_spots + OLD.quantity
    WHERE id = OLD.class_schedule_id;
  END IF;
  
  RETURN NEW;
END;
$function$;