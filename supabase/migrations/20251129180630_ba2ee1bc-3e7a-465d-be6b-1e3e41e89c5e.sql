-- Create passes table for pricing information
CREATE TABLE public.passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT NOT NULL,
  features TEXT[] NOT NULL,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create class_schedules table for schedule information
CREATE TABLE public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  name TEXT NOT NULL,
  age TEXT NOT NULL,
  level TEXT NOT NULL,
  spots TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read passes and schedules
CREATE POLICY "Anyone can view passes"
  ON public.passes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view class schedules"
  ON public.class_schedules FOR SELECT
  USING (true);

-- Insert existing pass data
INSERT INTO public.passes (name, price, description, features, popular) VALUES
('Karnet miesięczny', '280 zł', '4 zajęcia w miesiącu', 
  ARRAY['1 zajęcie tygodniowo', 'Stały dzień i godzina', 'Priorytetowa rezerwacja', 'Dostęp do materiałów online'], false),
('Karnet elastyczny', '320 zł', '4 zajęcia do wykorzystania w ciągu 5 tygodni',
  ARRAY['Dowolny wybór terminów', 'Większa elastyczność', 'Rezerwacja przez stronę', 'Dostęp do materiałów online'], true),
('Zajęcia jednorazowe', '90 zł', 'Pojedyncze zajęcia',
  ARRAY['Bez zobowiązań', 'Idealne na start', 'Wszystkie poziomy', 'Rezerwacja z wyprzedzeniem'], false);

-- Insert existing schedule data for Funka location
INSERT INTO public.class_schedules (location, day, time, name, age, level, spots) VALUES
-- Poniedziałek
('funka', 'Poniedziałek', '16:00-17:00', 'Kids Aerial', '6-8 lat', 'Początkujący', 'Dostępne miejsca'),
('funka', 'Poniedziałek', '17:15-18:15', 'Aerial Hoop', '9-12 lat', 'Średniozaawansowany', 'Ostatnie miejsca'),
('funka', 'Poniedziałek', '18:30-20:00', 'Aerial Silk', 'Dorośli', 'Zaawansowany', 'Dostępne miejsca'),
-- Środa
('funka', 'Środa', '16:00-17:00', 'Kids Aerial', '9-12 lat', 'Początkujący', 'Dostępne miejsca'),
('funka', 'Środa', '17:15-18:45', 'Aerial Hoop', 'Dorośli', 'Początkujący', 'Nowa grupa! Zapisy otwarte'),
('funka', 'Środa', '19:00-20:30', 'Aerial Silk', 'Dorośli', 'Średniozaawansowany', 'Dostępne miejsca'),
-- Piątek
('funka', 'Piątek', '16:00-17:00', 'Kids Aerial', '6-8 lat', 'Zaawansowany', 'Lista rezerwowa'),
('funka', 'Piątek', '17:15-18:45', 'Aerial Hoop', 'Młodzież 13+', 'Średniozaawansowany', 'Dostępne miejsca'),
('funka', 'Piątek', '19:00-20:30', 'Aerial Silk & Hoop Mix', 'Dorośli', 'Wszyscy poziomy', 'Nowa grupa!'),
-- Bałtycka location
-- Wtorek
('baltycka', 'Wtorek', '16:30-17:30', 'Kids Aerial', '6-8 lat', 'Początkujący', 'Dostępne miejsca'),
('baltycka', 'Wtorek', '17:45-18:45', 'Aerial Hoop', '9-12 lat', 'Początkujący', 'Dostępne miejsca'),
('baltycka', 'Wtorek', '19:00-20:30', 'Aerial Silk', 'Dorośli', 'Zaawansowany', 'Ostatnie miejsca'),
-- Czwartek
('baltycka', 'Czwartek', '16:30-17:30', 'Kids Aerial', '9-12 lat', 'Średniozaawansowany', 'Dostępne miejsca'),
('baltycka', 'Czwartek', '17:45-19:15', 'Aerial Hoop', 'Dorośli', 'Średniozaawansowany', 'Dostępne miejsca'),
('baltycka', 'Czwartek', '19:30-21:00', 'Aerial Silk', 'Dorośli', 'Początkujący', 'Nowa grupa!'),
-- Sobota
('baltycka', 'Sobota', '10:00-11:00', 'Kids Aerial', '6-8 lat', 'Wszystkie poziomy', 'Dostępne miejsca'),
('baltycka', 'Sobota', '11:15-12:15', 'Kids Aerial', '9-12 lat', 'Wszystkie poziomy', 'Dostępne miejsca'),
('baltycka', 'Sobota', '12:30-14:00', 'Aerial Hoop & Silk', 'Dorośli', 'Wszystkie poziomy', 'Open training');