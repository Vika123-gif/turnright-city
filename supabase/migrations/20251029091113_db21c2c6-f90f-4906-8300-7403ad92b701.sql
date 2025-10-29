-- Security Fixes Migration - Part 2: Fix SECURITY DEFINER Functions
-- Add SET search_path = public to all SECURITY DEFINER functions

-- These functions need DROP FUNCTION because we're changing their signatures
DROP FUNCTION IF EXISTS public.cleanup_expired_cache() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_visitor_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_location_exits() CASCADE;
DROP FUNCTION IF EXISTS public.reset_daily_limits() CASCADE;

-- Recreate functions with fixed search_path
CREATE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM search_cache WHERE expires_at < NOW();
  DELETE FROM places_cache WHERE expires_at < NOW();
END;
$$;

CREATE FUNCTION public.cleanup_old_visitor_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM visitor_sessions 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

CREATE FUNCTION public.cleanup_old_location_exits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM location_exits 
  WHERE clicked_at < NOW() - INTERVAL '90 days';
END;
$$;

CREATE FUNCTION public.reset_daily_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM buy_button_clicks 
  WHERE clicked_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Update remaining functions that need search_path (using ALTER)
ALTER FUNCTION public.get_cached_places_nearby(numeric, numeric, integer, text) SET search_path = public;
ALTER FUNCTION public.check_generation_limit(text) SET search_path = public;