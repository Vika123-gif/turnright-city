-- Security Fixes Migration
-- Fix warn-level security issues

-- 1. Fix saved_routes nullable user_id
-- First, clean up existing NULL user_id entries
DELETE FROM saved_routes WHERE user_id IS NULL;

-- Add NOT NULL constraint to user_id
ALTER TABLE saved_routes 
  ALTER COLUMN user_id SET NOT NULL;

-- 2. Add IP anonymization trigger for visitor_sessions
-- Drop trigger if it exists, then recreate
DROP TRIGGER IF EXISTS anonymize_visitor_session_ip ON visitor_sessions;

CREATE TRIGGER anonymize_visitor_session_ip
  BEFORE INSERT OR UPDATE ON visitor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_ip_on_insert();

-- Retroactively anonymize existing visitor session data
UPDATE visitor_sessions 
SET anonymized_ip = anonymize_ip(ip_address),
    ip_address = NULL
WHERE ip_address IS NOT NULL;

-- 3. Add index to improve saved_routes queries
CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);

-- Add comment documenting the security fixes
COMMENT ON TABLE saved_routes IS 'User-created routes with RLS policies. user_id is required for proper access control.';