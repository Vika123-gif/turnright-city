-- Add dedicated travel_type column to user_interactions
ALTER TABLE public.user_interactions
ADD COLUMN IF NOT EXISTS travel_type TEXT;

-- Optional index to filter by travel_type in analytics
CREATE INDEX IF NOT EXISTS idx_user_interactions_travel_type
ON public.user_interactions(travel_type);


