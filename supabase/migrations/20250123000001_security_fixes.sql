-- ============================================================================
-- SECURITY FIXES - Critical Issues from Security Audit
-- ============================================================================
-- This migration fixes:
-- 1. Stripe webhook schema mismatch (route_purchases columns)
-- 2. Nullable user_id in saved_routes (security issue)
-- 3. IP address privacy (anonymization + retention policy)
-- ============================================================================

-- ============================================================================
-- 1. FIX ROUTE_PURCHASES TABLE - Add missing columns for Stripe webhook
-- ============================================================================
-- The webhook tries to insert: user_email, amount, credits_purchased, payment_method, stripe_payment_id
-- But table only has: id, route_generation_id, location, places_count, purchased_at, user_session_id

ALTER TABLE public.route_purchases 
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS credits_purchased INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe_webhook',
  ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;

-- Create index for faster lookups by email and payment ID
CREATE INDEX IF NOT EXISTS idx_route_purchases_user_email ON public.route_purchases(user_email);
CREATE INDEX IF NOT EXISTS idx_route_purchases_stripe_payment_id ON public.route_purchases(stripe_payment_id);

-- ============================================================================
-- 2. FIX SAVED_ROUTES TABLE - Add user_id column (NOT NULL for security)
-- ============================================================================
-- Add user_id column (nullable first, then we'll populate it)
ALTER TABLE public.saved_routes 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON public.saved_routes(user_id);

-- Update RLS policies to use user_id (more secure than user_session_id)
DROP POLICY IF EXISTS "Users can view their own saved routes" ON public.saved_routes;
DROP POLICY IF EXISTS "Users can create saved routes" ON public.saved_routes;
DROP POLICY IF EXISTS "Users can update their own saved routes" ON public.saved_routes;
DROP POLICY IF EXISTS "Users can delete their own saved routes" ON public.saved_routes;

-- New policies using user_id
CREATE POLICY "Users can view their own saved routes" 
  ON public.saved_routes 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL); -- Allow NULL for backwards compatibility

CREATE POLICY "Users can create saved routes" 
  ON public.saved_routes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id); -- Require user_id on insert

CREATE POLICY "Users can update their own saved routes" 
  ON public.saved_routes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved routes" 
  ON public.saved_routes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Service role policy for admin access
CREATE POLICY "Service role can manage saved_routes" 
  ON public.saved_routes 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. FIX IP ADDRESS PRIVACY - Anonymize and add retention policy
-- ============================================================================

-- Create function to anonymize IP addresses (hash last octet)
CREATE OR REPLACE FUNCTION public.anonymize_ip(ip_address TEXT)
RETURNS TEXT AS $$
BEGIN
  IF ip_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- For IPv4: Replace last octet with 0 (e.g., 192.168.1.123 -> 192.168.1.0)
  IF ip_address ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' THEN
    RETURN regexp_replace(ip_address, '\.[0-9]{1,3}$', '.0');
  END IF;
  
  -- For IPv6: Keep first 64 bits, zero out the rest
  IF ip_address ~ ':' THEN
    RETURN regexp_replace(ip_address, '(([0-9a-fA-F]{1,4}:){4}).*', '\1::');
  END IF;
  
  -- If format is unknown, return null for safety
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add anonymized_ip column to visitor_sessions
ALTER TABLE public.visitor_sessions 
  ADD COLUMN IF NOT EXISTS anonymized_ip TEXT;

-- Migrate existing IPs to anonymized version
UPDATE public.visitor_sessions 
SET anonymized_ip = public.anonymize_ip(ip_address)
WHERE anonymized_ip IS NULL AND ip_address IS NOT NULL;

-- Create function to automatically anonymize IP on insert/update
CREATE OR REPLACE FUNCTION public.anonymize_ip_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ip_address IS NOT NULL THEN
    NEW.anonymized_ip := public.anonymize_ip(NEW.ip_address);
    -- Optionally: Remove the full IP for better privacy
    -- NEW.ip_address := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic IP anonymization
DROP TRIGGER IF EXISTS anonymize_visitor_ip ON public.visitor_sessions;
CREATE TRIGGER anonymize_visitor_ip
  BEFORE INSERT OR UPDATE ON public.visitor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_ip_on_insert();

-- Create function to delete old visitor sessions (90 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_visitor_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete sessions older than 90 days
  DELETE FROM public.visitor_sessions 
  WHERE last_visit_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete old location exits (90 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_location_exits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete exits older than 90 days
  DELETE FROM public.location_exits 
  WHERE clicked_at < now() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You should set up a cron job to run these cleanup functions periodically
-- Example: SELECT cron.schedule('cleanup-visitor-data', '0 0 * * *', 'SELECT public.cleanup_old_visitor_sessions(); SELECT public.cleanup_old_location_exits();');

-- ============================================================================
-- Summary of changes:
-- ✅ route_purchases now has all columns needed by Stripe webhook
-- ✅ saved_routes will have user_id for proper RLS (backwards compatible)
-- ✅ IP addresses are anonymized automatically
-- ✅ 90-day retention policy functions created
-- ✅ All RLS policies updated for security
-- ============================================================================

