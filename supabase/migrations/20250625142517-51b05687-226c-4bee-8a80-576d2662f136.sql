
-- First, let's drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow anonymous inserts for route_generations" ON public.route_generations;
DROP POLICY IF EXISTS "Allow authenticated inserts for route_generations" ON public.route_generations;
DROP POLICY IF EXISTS "Allow anonymous inserts for user_feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Allow authenticated inserts for user_feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Allow anonymous inserts for route_purchases" ON public.route_purchases;
DROP POLICY IF EXISTS "Allow authenticated inserts for route_purchases" ON public.route_purchases;
DROP POLICY IF EXISTS "Allow authenticated select for route_generations" ON public.route_generations;
DROP POLICY IF EXISTS "Allow authenticated select for user_feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Allow authenticated select for route_purchases" ON public.route_purchases;

-- Create very permissive policies for anonymous users (since we're not using authentication)
CREATE POLICY "Allow all inserts for route_generations" 
  ON public.route_generations 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow all inserts for user_feedback" 
  ON public.user_feedback 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow all inserts for route_purchases" 
  ON public.route_purchases 
  FOR INSERT 
  WITH CHECK (true);

-- Allow authenticated users to read all data (for admin dashboard)
CREATE POLICY "Allow authenticated select for route_generations" 
  ON public.route_generations 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated select for user_feedback" 
  ON public.user_feedback 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated select for route_purchases" 
  ON public.route_purchases 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Also allow anonymous users to read their own data if needed
CREATE POLICY "Allow anonymous select for route_generations" 
  ON public.route_generations 
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow anonymous select for user_feedback" 
  ON public.user_feedback 
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow anonymous select for route_purchases" 
  ON public.route_purchases 
  FOR SELECT 
  TO anon 
  USING (true);
