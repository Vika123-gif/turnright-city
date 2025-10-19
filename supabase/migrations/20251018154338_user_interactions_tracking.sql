-- Create comprehensive user interactions tracking table
CREATE TABLE public.user_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL, -- 'button_click', 'form_submit', 'page_view', 'route_action', etc.
  interaction_name TEXT NOT NULL, -- specific action like 'save_route', 'leave_comment', 'start_chat_again'
  page_path TEXT, -- current page/route
  component_name TEXT, -- React component where interaction occurred
  interaction_data JSONB, -- additional data about the interaction
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT
);

-- Create table for detailed route generation tracking
CREATE TABLE public.route_generation_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session_id TEXT NOT NULL,
  route_generation_id UUID REFERENCES public.route_generations(id),
  
  -- User input data
  scenario TEXT NOT NULL, -- 'onsite' or 'planning'
  location TEXT NOT NULL,
  time_window INTEGER, -- in minutes
  goals TEXT[] NOT NULL,
  additional_settings TEXT[],
  destination_type TEXT, -- 'none', 'circle', 'specific'
  destination TEXT,
  days INTEGER, -- for planning scenario
  
  -- Generation process data
  generation_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generation_completed_at TIMESTAMP WITH TIME ZONE,
  generation_duration_ms INTEGER,
  api_calls_made INTEGER DEFAULT 0,
  api_errors TEXT[],
  
  -- Result data
  places_found INTEGER DEFAULT 0,
  places_returned INTEGER DEFAULT 0,
  total_walking_time INTEGER DEFAULT 0,
  total_visit_time INTEGER DEFAULT 0,
  route_optimization_applied BOOLEAN DEFAULT false,
  
  -- Debug data
  debug_info JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for button click tracking
CREATE TABLE public.button_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session_id TEXT NOT NULL,
  button_type TEXT NOT NULL,
  button_text TEXT,
  component_name TEXT,
  page_path TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  additional_data JSONB
);

-- Enable Row Level Security
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_generation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.button_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anyone to insert (for anonymous users)
CREATE POLICY "Anyone can insert user interactions" 
  ON public.user_interactions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can insert route generation details" 
  ON public.route_generation_details 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can insert button clicks" 
  ON public.button_clicks 
  FOR INSERT 
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_user_interactions_session_id ON public.user_interactions(user_session_id);
CREATE INDEX idx_user_interactions_type ON public.user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_timestamp ON public.user_interactions(timestamp);
CREATE INDEX idx_user_interactions_page_path ON public.user_interactions(page_path);

CREATE INDEX idx_route_generation_details_session_id ON public.route_generation_details(user_session_id);
CREATE INDEX idx_route_generation_details_scenario ON public.route_generation_details(scenario);
CREATE INDEX idx_route_generation_details_location ON public.route_generation_details(location);
CREATE INDEX idx_route_generation_details_created_at ON public.route_generation_details(created_at);

CREATE INDEX idx_button_clicks_session_id ON public.button_clicks(user_session_id);
CREATE INDEX idx_button_clicks_type ON public.button_clicks(button_type);
CREATE INDEX idx_button_clicks_clicked_at ON public.button_clicks(clicked_at);
