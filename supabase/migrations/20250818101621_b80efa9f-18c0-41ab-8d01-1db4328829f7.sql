-- Create waitlist table to store user requests for new cities
CREATE TABLE public.waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    desired_city text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now(),
    user_session_id text,
    ip_address text,
    user_agent text
);

-- Enable RLS on waitlist table
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit to waitlist
CREATE POLICY "Allow public to submit waitlist entries"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Only admins can view waitlist entries
CREATE POLICY "Only authenticated admins can view waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
);

-- Create index for better performance on email lookups
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_submitted_at ON public.waitlist(submitted_at DESC);