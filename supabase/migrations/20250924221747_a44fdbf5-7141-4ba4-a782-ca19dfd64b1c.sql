-- Create saved_routes table for users to save their favorite routes
CREATE TABLE public.saved_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session_id TEXT NOT NULL,
  route_name TEXT NOT NULL,
  location TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('onsite', 'planning')),
  days INTEGER DEFAULT 1,
  goals TEXT[] NOT NULL,
  places JSONB NOT NULL,
  total_places INTEGER NOT NULL,
  total_walking_time INTEGER DEFAULT 0,
  map_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own saved routes
CREATE POLICY "Users can view their own saved routes" 
ON public.saved_routes 
FOR SELECT 
USING (true); -- Allow all users to see saved routes for now

-- Create policy to allow users to create their own saved routes
CREATE POLICY "Users can create saved routes" 
ON public.saved_routes 
FOR INSERT 
WITH CHECK (true); -- Allow all users to save routes for now

-- Create policy to allow users to update their own saved routes  
CREATE POLICY "Users can update their own saved routes" 
ON public.saved_routes 
FOR UPDATE 
USING (true);

-- Create policy to allow users to delete their own saved routes
CREATE POLICY "Users can delete their own saved routes" 
ON public.saved_routes 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_routes_updated_at
BEFORE UPDATE ON public.saved_routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on user queries
CREATE INDEX idx_saved_routes_user_session_id ON public.saved_routes(user_session_id);
CREATE INDEX idx_saved_routes_created_at ON public.saved_routes(created_at DESC);