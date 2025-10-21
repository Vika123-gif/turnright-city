-- Fix RLS policies for user_interactions table
-- Allow authenticated users to insert their own interactions
CREATE POLICY "Users can insert their own interactions" ON public.user_interactions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (user_id IS NULL OR user_id = auth.uid())
);

-- Allow authenticated users to view their own interactions
CREATE POLICY "Users can view their own interactions" ON public.user_interactions
FOR SELECT USING (
  auth.uid() IS NOT NULL AND 
  (user_id IS NULL OR user_id = auth.uid())
);

-- Allow authenticated users to update their own interactions
CREATE POLICY "Users can update their own interactions" ON public.user_interactions
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND 
  (user_id IS NULL OR user_id = auth.uid())
);

-- Allow service role to do everything (for webhooks and admin functions)
CREATE POLICY "Service role can do everything" ON public.user_interactions
FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS on the table
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
