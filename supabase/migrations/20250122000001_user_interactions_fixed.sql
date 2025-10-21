-- Create comprehensive user tracking table
CREATE TABLE public.user_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Interaction details
  action_type TEXT NOT NULL, -- 'button_click', 'route_generate', 'route_complete', 'comment', 'purchase', 'page_view'
  action_name TEXT NOT NULL, -- 'generate_route', 'start_again', 'buy_credits', 'give_feedback', etc.
  
  -- Route/Generation details
  route_id UUID, -- Links to route if applicable
  scenario TEXT, -- 'onsite' or 'planning'
  location TEXT,
  time_minutes INTEGER,
  categories TEXT[], -- Array of selected categories
  days INTEGER, -- For planning scenario
  
  -- Results
  places_found INTEGER DEFAULT 0,
  places_data JSONB, -- Full places data
  generation_successful BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- User feedback
  user_comment TEXT,
  rating INTEGER, -- 1-5 star rating
  feedback_type TEXT, -- 'positive', 'negative', 'suggestion'
  
  -- Purchase details
  purchase_amount DECIMAL(10,2),
  credits_purchased INTEGER,
  payment_method TEXT,
  stripe_payment_id TEXT,
  
  -- Session info
  session_id TEXT,
  page_url TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX idx_user_interactions_user_email ON public.user_interactions(user_email);
CREATE INDEX idx_user_interactions_action_type ON public.user_interactions(action_type);
CREATE INDEX idx_user_interactions_created_at ON public.user_interactions(created_at);
CREATE INDEX idx_user_interactions_route_id ON public.user_interactions(route_id);

-- Enable Row Level Security
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own interactions
CREATE POLICY "Users can view their own interactions" 
ON public.user_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own interactions
CREATE POLICY "Users can create their own interactions" 
ON public.user_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own interactions
CREATE POLICY "Users can update their own interactions" 
ON public.user_interactions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_interactions_timestamp
BEFORE UPDATE ON public.user_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_interactions_updated_at();

-- Create function to log user interaction
CREATE OR REPLACE FUNCTION public.log_user_interaction(
  p_user_id UUID,
  p_user_email TEXT,
  p_action_type TEXT,
  p_action_name TEXT,
  p_route_id UUID DEFAULT NULL,
  p_scenario TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_time_minutes INTEGER DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL,
  p_days INTEGER DEFAULT NULL,
  p_places_found INTEGER DEFAULT NULL,
  p_places_data JSONB DEFAULT NULL,
  p_generation_successful BOOLEAN DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_user_comment TEXT DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL,
  p_feedback_type TEXT DEFAULT NULL,
  p_purchase_amount DECIMAL DEFAULT NULL,
  p_credits_purchased INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_stripe_payment_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  interaction_id UUID;
BEGIN
  INSERT INTO public.user_interactions (
    user_id, user_email, action_type, action_name, route_id, scenario,
    location, time_minutes, categories, days, places_found, places_data,
    generation_successful, error_message, user_comment, rating, feedback_type,
    purchase_amount, credits_purchased, payment_method, stripe_payment_id,
    session_id, page_url, user_agent
  ) VALUES (
    p_user_id, p_user_email, p_action_type, p_action_name, p_route_id, p_scenario,
    p_location, p_time_minutes, p_categories, p_days, p_places_found, p_places_data,
    p_generation_successful, p_error_message, p_user_comment, p_rating, p_feedback_type,
    p_purchase_amount, p_credits_purchased, p_payment_method, p_stripe_payment_id,
    p_session_id, p_page_url, p_user_agent
  ) RETURNING id INTO interaction_id;
  
  RETURN interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create view for easy analytics (without RLS policy)
CREATE VIEW public.user_analytics AS
SELECT 
  user_id,
  user_email,
  COUNT(*) as total_interactions,
  COUNT(CASE WHEN action_type = 'button_click' THEN 1 END) as button_clicks,
  COUNT(CASE WHEN action_type = 'route_generate' THEN 1 END) as routes_generated,
  COUNT(CASE WHEN action_type = 'route_complete' THEN 1 END) as routes_completed,
  COUNT(CASE WHEN action_type = 'purchase' THEN 1 END) as purchases_made,
  COUNT(CASE WHEN action_type = 'comment' THEN 1 END) as comments_given,
  SUM(purchase_amount) as total_spent,
  SUM(credits_purchased) as total_credits_purchased,
  AVG(rating) as average_rating,
  MAX(created_at) as last_activity,
  MIN(created_at) as first_activity
FROM public.user_interactions
GROUP BY user_id, user_email;
