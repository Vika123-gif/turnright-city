-- Create places cache table to store discovered places
CREATE TABLE public.places_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT UNIQUE NOT NULL, -- Google Places place_id
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  types TEXT[] NOT NULL,
  rating DECIMAL(3, 2),
  user_ratings_total INTEGER,
  photos JSONB, -- Store photo references
  editorial_summary TEXT,
  business_status TEXT,
  opening_hours JSONB,
  price_level INTEGER,
  vicinity TEXT,
  formatted_address TEXT,
  enriched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Create search cache table for API search results
CREATE TABLE public.search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL, -- Hash of search parameters
  search_type TEXT NOT NULL, -- 'nearby', 'text', 'details'
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lon DECIMAL(11, 8) NOT NULL,
  radius INTEGER NOT NULL,
  goal TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Enable PostGIS extension for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spatial index for location-based queries on places_cache
CREATE INDEX idx_places_cache_location ON public.places_cache USING GIST (
  ST_Point(lon, lat)
);

-- Index for place_id lookups
CREATE INDEX idx_places_cache_place_id ON public.places_cache(place_id);

-- Index for expiration cleanup
CREATE INDEX idx_places_cache_expires ON public.places_cache(expires_at);

-- Index for cache key lookups
CREATE INDEX idx_search_cache_key ON public.search_cache(cache_key);

-- Index for spatial search cache queries
CREATE INDEX idx_search_cache_location ON public.search_cache USING GIST (
  ST_Point(location_lon, location_lat)
);

-- Index for expiration cleanup
CREATE INDEX idx_search_cache_expires ON public.search_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role full access (for Edge Functions)
CREATE POLICY "Service role can manage places_cache" 
  ON public.places_cache 
  FOR ALL 
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage search_cache" 
  ON public.search_cache 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Delete expired places cache entries
  DELETE FROM public.places_cache 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete expired search cache entries
  DELETE FROM public.search_cache 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get cached places within radius
CREATE OR REPLACE FUNCTION public.get_cached_places_nearby(
  p_lat DECIMAL(10, 8),
  p_lon DECIMAL(11, 8),
  p_radius INTEGER,
  p_goal TEXT
)
RETURNS TABLE(
  place_id TEXT,
  name TEXT,
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  types TEXT[],
  rating DECIMAL(3, 2),
  user_ratings_total INTEGER,
  photos JSONB,
  editorial_summary TEXT,
  business_status TEXT,
  opening_hours JSONB,
  price_level INTEGER,
  vicinity TEXT,
  formatted_address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.place_id,
    pc.name,
    pc.lat,
    pc.lon,
    pc.types,
    pc.rating,
    pc.user_ratings_total,
    pc.photos,
    pc.editorial_summary,
    pc.business_status,
    pc.opening_hours,
    pc.price_level,
    pc.vicinity,
    pc.formatted_address
  FROM public.places_cache pc
  WHERE pc.expires_at > now()
    AND ST_DWithin(
      ST_Point(pc.lon, pc.lat),
      ST_Point(p_lon, p_lat),
      p_radius
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
