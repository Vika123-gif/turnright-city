
-- Create a table to store route generation results
CREATE TABLE public.route_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location TEXT NOT NULL,
  time_window TEXT,
  goals TEXT[], -- Array of goals like 'eat', 'coffee', 'explore', 'work'
  places_generated JSONB, -- Store the full places data as JSON
  places_count INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_session_id TEXT -- For tracking without requiring authentication
);

-- Create a table to store user feedback
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_generation_id UUID REFERENCES public.route_generations(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text_feedback TEXT,
  location TEXT,
  places_count INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_session_id TEXT
);

-- Create a table to store purchase tracking
CREATE TABLE public.route_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_generation_id UUID REFERENCES public.route_generations(id),
  location TEXT,
  places_count INTEGER,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_session_id TEXT
);

-- Enable Row Level Security (but make tables readable by service role for admin access)
ALTER TABLE public.route_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anyone to insert (for anonymous users)
-- but only service role to read all data (for admin dashboard)
CREATE POLICY "Anyone can insert route generations" 
  ON public.route_generations 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can insert feedback" 
  ON public.user_feedback 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can insert purchases" 
  ON public.route_purchases 
  FOR INSERT 
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_route_generations_generated_at ON public.route_generations(generated_at DESC);
CREATE INDEX idx_user_feedback_submitted_at ON public.user_feedback(submitted_at DESC);
CREATE INDEX idx_route_purchases_purchased_at ON public.route_purchases(purchased_at DESC);
CREATE INDEX idx_route_generations_location ON public.route_generations(location);
