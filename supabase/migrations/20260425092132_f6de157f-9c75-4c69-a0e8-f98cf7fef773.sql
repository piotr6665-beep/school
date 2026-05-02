-- =========================================
-- 1. REALTIME RLS for bookings
-- =========================================
-- Enable RLS on realtime.messages if not already
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any existing booking-related realtime policies to avoid duplicates
DROP POLICY IF EXISTS "Users can subscribe to own bookings realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Admins can subscribe to all bookings realtime" ON realtime.messages;

-- Users can only receive realtime events for their own bookings
CREATE POLICY "Users can subscribe to own bookings realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (extension = 'postgres_changes')
  AND (
    -- Allow receiving change events only when the row's user_id matches
    (payload->'data'->'record'->>'user_id')::uuid = auth.uid()
    OR (payload->'data'->'old_record'->>'user_id')::uuid = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- =========================================
-- 2. user_roles hardening
-- =========================================
-- Add admin SELECT policy so admins can see all role assignments
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Explicitly deny client-side INSERT/UPDATE/DELETE (only service_role bypasses RLS)
DROP POLICY IF EXISTS "Block client inserts to user_roles" ON public.user_roles;
CREATE POLICY "Block client inserts to user_roles"
ON public.user_roles
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates to user_roles" ON public.user_roles;
CREATE POLICY "Block client updates to user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Block client deletes to user_roles" ON public.user_roles;
CREATE POLICY "Block client deletes to user_roles"
ON public.user_roles
FOR DELETE
TO authenticated, anon
USING (false);

-- =========================================
-- 3. Storage buckets - prevent listing
-- =========================================
-- Replace overly broad SELECT policies on storage.objects so that:
--  - direct file access via public URL still works (Supabase serves these via the storage API
--    using the bucket's public flag, not via RLS on storage.objects for HTTP GET);
--  - listing the bucket via the client SDK (which queries storage.objects) is restricted to admins.

DROP POLICY IF EXISTS "Anyone can view gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;

CREATE POLICY "Admins can list gallery objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can list event objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'events' AND public.has_role(auth.uid(), 'admin'::public.app_role));