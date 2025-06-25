
-- Create table for visitor tracking
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session_id TEXT NOT NULL,
  first_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  visit_count INTEGER NOT NULL DEFAULT 1,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT
);

-- Create table for location button clicks (leaving location)
CREATE TABLE public.location_exits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session_id TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_location TEXT,
  exit_action TEXT -- 'detect_location' or 'manual_input'
);

-- Create indexes for better query performance
CREATE INDEX idx_visitor_sessions_user_session_id ON public.visitor_sessions(user_session_id);
CREATE INDEX idx_visitor_sessions_first_visit ON public.visitor_sessions(first_visit_at);
CREATE INDEX idx_location_exits_user_session_id ON public.location_exits(user_session_id);
CREATE INDEX idx_location_exits_clicked_at ON public.location_exits(clicked_at);

-- Add RLS policies (keeping them permissive since this is analytics data)
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_exits ENABLE ROW LEVEL SECURITY;

-- Allow all operations for visitor tracking (analytics data)
CREATE POLICY "Allow all operations on visitor_sessions" 
  ON public.visitor_sessions 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on location_exits" 
  ON public.location_exits 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
