
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeName, location } = await req.json();
    const mapboxApiKey = Deno.env.get('MAPBOX_API_KEY');

    if (!mapboxApiKey) {
      throw new Error('Mapbox API key not configured');
    }

    console.log(`Searching for "${placeName}" near ${location}`);

    // Use Mapbox Geocoding API to find the place
    const searchQuery = encodeURIComponent(`${placeName}, ${location}, Portugal`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchQuery}.json?access_token=${mapboxApiKey}&country=pt&limit=5&types=poi,address`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Mapbox returned ${data.features?.length || 0} results for "${placeName}"`);

    if (!data.features || data.features.length === 0) {
      // Fallback: try a broader search without the exact place name
      const broadQuery = encodeURIComponent(`${location}, Portugal`);
      const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${broadQuery}.json?access_token=${mapboxApiKey}&country=pt&limit=1`;
      
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();
      
      return new Response(JSON.stringify({
        found: false,
        placeName,
        address: fallbackData.features?.[0]?.place_name || `${location}, Portugal`,
        coordinates: fallbackData.features?.[0]?.geometry?.coordinates || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the best match (prefer POI over addresses)
    const bestMatch = data.features.find(f => 
      f.properties?.category?.includes('restaurant') || 
      f.properties?.category?.includes('cafe') ||
      f.place_type?.includes('poi')
    ) || data.features[0];

    return new Response(JSON.stringify({
      found: true,
      placeName,
      address: bestMatch.place_name,
      coordinates: bestMatch.geometry.coordinates, // [lng, lat]
      category: bestMatch.properties?.category,
      confidence: bestMatch.relevance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mapbox-geocoding function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to geocode address',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
