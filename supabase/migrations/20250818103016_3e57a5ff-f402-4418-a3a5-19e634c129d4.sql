-- Fix security vulnerability: Ensure waitlist table is not publicly readable
-- Drop the existing SELECT policy and recreate it properly
DROP POLICY IF EXISTS "Only authenticated admins can view waitlist" ON public.waitlist;

-- Create a more restrictive SELECT policy that applies to all roles
CREATE POLICY "Only authenticated admins can view waitlist" 
ON public.waitlist 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND is_admin(auth.uid())
);

-- Add an explicit DENY policy for public access to SELECT
CREATE POLICY "Deny public access to waitlist data" 
ON public.waitlist 
FOR SELECT 
TO public 
USING (false);