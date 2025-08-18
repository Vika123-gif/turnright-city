-- Fix RLS policy conflicts for waitlist table
-- Drop all existing SELECT policies to start clean
DROP POLICY IF EXISTS "Only authenticated admins can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Deny public access to waitlist data" ON public.waitlist;

-- Create a single, comprehensive SELECT policy that denies all access except authenticated admins
CREATE POLICY "Restrict waitlist access to authenticated admins only" 
ON public.waitlist 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND is_admin(auth.uid())
);

-- Verify the INSERT policy is correctly configured (should already exist)
-- This allows public users to insert but not read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waitlist' 
    AND policyname = 'Allow public to submit waitlist entries' 
    AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Allow public to submit waitlist entries"
    ON public.waitlist
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;