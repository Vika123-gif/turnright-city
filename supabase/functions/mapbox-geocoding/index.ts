
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

    // Use Mapbox Geocoding API to find the place with detailed address information
    const searchQuery = encodeURIComponent(`${placeName}, ${location}, Portugal`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchQuery}.json?access_token=${mapboxApiKey}&country=pt&limit=10&types=poi,address&language=pt`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Mapbox returned ${data.features?.length || 0} results for "${placeName}"`);

    if (!data.features || data.features.length === 0) {
      // Fallback: try a broader search
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

    // Find the best match with the most detailed address
    let bestMatch = null;
    
    // First priority: exact POI match with detailed address
    for (const feature of data.features) {
      if (feature.place_type?.includes('poi') || feature.properties?.category) {
        // Check if this result has detailed address components
        const hasStreetAddress = feature.context?.some(ctx => 
          ctx.id?.startsWith('address') || ctx.id?.startsWith('street')
        );
        
        if (hasStreetAddress) {
          bestMatch = feature;
          break;
        }
      }
    }
    
    // Second priority: any POI
    if (!bestMatch) {
      bestMatch = data.features.find(f => 
        f.place_type?.includes('poi') || f.properties?.category
      );
    }
    
    // Third priority: address type
    if (!bestMatch) {
      bestMatch = data.features.find(f => f.place_type?.includes('address'));
    }
    
    // Last resort: first result
    if (!bestMatch) {
      bestMatch = data.features[0];
    }

    // Build detailed address from components
    let detailedAddress = bestMatch.place_name;
    
    if (bestMatch.context) {
      const addressComponents = {
        street: null,
        number: null,
        postcode: null,
        place: null
      };
      
      // Extract address components
      for (const component of bestMatch.context) {
        if (component.id?.startsWith('address')) {
          addressComponents.street = component.text;
        } else if (component.id?.startsWith('postcode')) {
          addressComponents.postcode = component.text;
        } else if (component.id?.startsWith('place')) {
          addressComponents.place = component.text;
        }
      }
      
      // If we have detailed components, construct a better address
      if (addressComponents.street || addressComponents.postcode) {
        const parts = [];
        
        if (addressComponents.street) {
          parts.push(addressComponents.street);
        }
        
        if (addressComponents.postcode && addressComponents.place) {
          parts.push(`${addressComponents.postcode} ${addressComponents.place}`);
        } else if (addressComponents.place) {
          parts.push(addressComponents.place);
        }
        
        parts.push('Portugal');
        
        if (parts.length > 1) {
          detailedAddress = parts.join(', ');
        }
      }
    }

    return new Response(JSON.stringify({
      found: true,
      placeName,
      address: detailedAddress,
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
