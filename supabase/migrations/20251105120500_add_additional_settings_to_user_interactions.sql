-- Add array column to track Additional Settings selections (checkboxes)
ALTER TABLE public.user_interactions
ADD COLUMN IF NOT EXISTS additional_settings TEXT[];

-- Index for querying by selected settings
CREATE INDEX IF NOT EXISTS idx_user_interactions_additional_settings
ON public.user_interactions USING GIN (additional_settings);


