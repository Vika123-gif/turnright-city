-- Create user_sessions table for tracking generation attempts
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL, -- Unique session identifier
  generation_count INTEGER NOT NULL DEFAULT 0,
  first_generation_at TIMESTAMP WITH TIME ZONE,
  last_generation_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for session lookups
CREATE INDEX idx_user_sessions_session_id ON public.user_sessions(session_id);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access (for Edge Functions)
CREATE POLICY "Service role can manage user_sessions" 
  ON public.user_sessions 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Create function to check and increment generation count
CREATE OR REPLACE FUNCTION public.check_generation_limit(p_session_id TEXT)
RETURNS TABLE(
  can_generate BOOLEAN,
  attempts_used INTEGER,
  attempts_remaining INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  session_record RECORD;
  max_attempts INTEGER := 3;
BEGIN
  -- Get or create session record
  INSERT INTO public.user_sessions (session_id, generation_count)
  VALUES (p_session_id, 0)
  ON CONFLICT (session_id) DO NOTHING;
  
  -- Get current session data
  SELECT * INTO session_record
  FROM public.user_sessions
  WHERE session_id = p_session_id;
  
  -- Check if user can generate
  IF session_record.generation_count < max_attempts THEN
    -- Increment count and update timestamps
    UPDATE public.user_sessions
    SET 
      generation_count = generation_count + 1,
      first_generation_at = COALESCE(first_generation_at, now()),
      last_generation_at = now(),
      updated_at = now()
    WHERE session_id = p_session_id;
    
    RETURN QUERY SELECT 
      true as can_generate,
      session_record.generation_count + 1 as attempts_used,
      max_attempts - (session_record.generation_count + 1) as attempts_remaining,
      NULL::TIMESTAMP WITH TIME ZONE as reset_at;
  ELSE
    RETURN QUERY SELECT 
      false as can_generate,
      session_record.generation_count as attempts_used,
      0 as attempts_remaining,
      session_record.created_at + INTERVAL '24 hours' as reset_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset daily limits (can be called by cron job)
CREATE OR REPLACE FUNCTION public.reset_daily_limits()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Reset sessions older than 24 hours
  UPDATE public.user_sessions
  SET 
    generation_count = 0,
    first_generation_at = NULL,
    last_generation_at = NULL,
    updated_at = now()
  WHERE created_at < now() - INTERVAL '24 hours'
    AND generation_count > 0;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
