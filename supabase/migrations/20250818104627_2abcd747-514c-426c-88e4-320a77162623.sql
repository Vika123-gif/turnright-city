-- Create a more comprehensive RLS setup for waitlist table
-- First, recreate the table with explicit RLS enforcement

-- Drop and recreate the SELECT policy with explicit role targeting
DROP POLICY IF EXISTS "Restrict waitlist access to authenticated admins only" ON public.waitlist;

-- Create explicit policies for different roles
-- 1. Deny all access to anonymous/public users for SELECT
CREATE POLICY "Deny all public SELECT access to waitlist" 
ON public.waitlist 
FOR SELECT 
TO anon, public
USING (false);

-- 2. Allow only authenticated admin users to SELECT
CREATE POLICY "Allow admin SELECT access to waitlist" 
ON public.waitlist 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Ensure RLS is enabled (should already be, but let's be explicit)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner (prevents bypassing RLS)
ALTER TABLE public.waitlist FORCE ROW LEVEL SECURITY;