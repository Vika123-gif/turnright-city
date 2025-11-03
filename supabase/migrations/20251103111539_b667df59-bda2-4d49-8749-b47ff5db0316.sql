-- Make user_email and user_id nullable to allow anonymous user tracking
ALTER TABLE user_interactions 
ALTER COLUMN user_email DROP NOT NULL,
ALTER COLUMN user_id DROP NOT NULL;

-- Add user_session_id column for tracking anonymous users
ALTER TABLE user_interactions 
ADD COLUMN IF NOT EXISTS user_session_id TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_session_id 
ON user_interactions(user_session_id);

-- Update button_clicks table to allow any button_type values
ALTER TABLE button_clicks 
DROP CONSTRAINT IF EXISTS button_clicks_button_type_check;