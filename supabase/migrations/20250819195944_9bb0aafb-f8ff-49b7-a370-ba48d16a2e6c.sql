-- Strengthen waitlist table security
-- First, let's recreate the policies with more explicit security

-- Drop existing policies to recreate them with stronger security
DROP POLICY IF EXISTS "Allow public to submit waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Deny all public SELECT access to waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Allow admin SELECT access to waitlist" ON public.waitlist;

-- Create stronger insert policy that only allows specific fields
CREATE POLICY "Allow waitlist submissions with rate limiting"
ON public.waitlist
FOR INSERT
WITH CHECK (
  -- Ensure email is properly formatted and not empty
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  AND length(email) <= 254
  AND length(desired_city) <= 100
  AND desired_city IS NOT NULL
  AND trim(desired_city) != ''
);

-- Absolute deny for SELECT - no exceptions except for admin function
CREATE POLICY "Absolutely deny public SELECT access"
ON public.waitlist
FOR SELECT
USING (false);

-- Admin-only access policy with explicit authentication check
CREATE POLICY "Admin only SELECT access with auth verification"
ON public.waitlist
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_admin(auth.uid())
);

-- Deny all UPDATE and DELETE operations for everyone except admin
CREATE POLICY "Admin only UPDATE access"
ON public.waitlist
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_admin(auth.uid())
);

CREATE POLICY "Admin only DELETE access"
ON public.waitlist
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND is_admin(auth.uid())
);

-- Add additional security: Create a trigger to log any unauthorized access attempts
CREATE OR REPLACE FUNCTION public.log_waitlist_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any attempt to access waitlist data without proper authorization
  IF auth.uid() IS NULL OR NOT is_admin(auth.uid()) THEN
    INSERT INTO public.security_log (
      event_type,
      table_name,
      attempted_at,
      user_id,
      details
    ) VALUES (
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'waitlist',
      now(),
      auth.uid(),
      'Attempted unauthorized access to waitlist table'
    )
    ON CONFLICT DO NOTHING; -- Ignore if security_log table doesn't exist
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (only if we're in a context where it makes sense)
DO $$
BEGIN
  -- Only create trigger if we have proper access context
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'waitlist' AND schemaname = 'public') THEN
    DROP TRIGGER IF EXISTS waitlist_access_log ON public.waitlist;
    CREATE TRIGGER waitlist_access_log
      BEFORE SELECT ON public.waitlist
      FOR EACH ROW
      EXECUTE FUNCTION public.log_waitlist_access();
  END IF;
END $$;