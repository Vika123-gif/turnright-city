-- Enable RLS on user_credits table
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Users can read their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can manage user_credits" ON public.user_credits;

-- Create strict RLS policies for user_credits table
-- Users can ONLY see their OWN credits
CREATE POLICY "Users can view only their own credits"
  ON public.user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can ONLY update their OWN credits
CREATE POLICY "Users can update only their own credits"
  ON public.user_credits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Only authenticated service role can insert new credits
CREATE POLICY "Service role can insert credits"
  ON public.user_credits
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service role can delete credits (for admin purposes)
CREATE POLICY "Service role can delete credits"
  ON public.user_credits
  FOR DELETE
  USING (auth.role() = 'service_role');