
-- Drop existing policies that aren't working
DROP POLICY IF EXISTS "Anyone can insert route generations" ON public.route_generations;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Anyone can insert purchases" ON public.route_purchases;

-- Create new policies that work with anonymous access
CREATE POLICY "Allow anonymous inserts for route_generations" 
  ON public.route_generations 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated inserts for route_generations" 
  ON public.route_generations 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts for user_feedback" 
  ON public.user_feedback 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated inserts for user_feedback" 
  ON public.user_feedback 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts for route_purchases" 
  ON public.route_purchases 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated inserts for route_purchases" 
  ON public.route_purchases 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Add select policies so the admin dashboard can read the data
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
