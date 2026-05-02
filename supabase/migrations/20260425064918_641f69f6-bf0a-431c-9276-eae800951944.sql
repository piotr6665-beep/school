-- Create public storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for event images
CREATE POLICY "Event images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'events');

-- Only admins can upload event images
CREATE POLICY "Admins can upload event images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'events'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can update event images
CREATE POLICY "Admins can update event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'events'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can delete event images
CREATE POLICY "Admins can delete event images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'events'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);