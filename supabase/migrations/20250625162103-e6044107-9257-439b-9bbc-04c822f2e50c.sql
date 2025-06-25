
-- Create a table to track buy button clicks
CREATE TABLE public.buy_button_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_generation_id uuid REFERENCES public.route_generations(id),
  location text,
  places_count integer,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  user_session_id text
);

-- Enable RLS for the new table
ALTER TABLE public.buy_button_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous inserts and reads
CREATE POLICY "Allow all inserts for buy_button_clicks" 
  ON public.buy_button_clicks 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select for buy_button_clicks" 
  ON public.buy_button_clicks 
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow authenticated select for buy_button_clicks" 
  ON public.buy_button_clicks 
  FOR SELECT 
  TO authenticated 
  USING (true);
