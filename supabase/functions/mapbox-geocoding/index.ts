
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

    console.log('=== MAPBOX GEOCODING DEBUG ===');
    console.log('Place name:', placeName);
    console.log('Location:', location);
    console.log('API key exists:', !!mapboxApiKey);
    console.log('API key configured properly:', mapboxApiKey ? 'YES' : 'NO');

    if (!mapboxApiKey) {
      console.error('MAPBOX_API_KEY environment variable not found');
      throw new Error('Mapbox API key not configured');
    }

    console.log(`Searching for "${placeName}" near ${location}`);

    // Enhanced Mapbox Geocoding API request for detailed addresses
    const searchQuery = encodeURIComponent(`${placeName}, ${location}, Portugal`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchQuery}.json?access_token=${mapboxApiKey}&country=pt&limit=10&types=poi,address&language=pt&routing=true&proximity=auto`;

    console.log('Making Mapbox API request...');

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox API response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Mapbox API error details:', errorText);
      throw new Error(`Mapbox API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Mapbox returned ${data.features?.length || 0} results for "${placeName}"`);
    
    if (data.features && data.features.length > 0) {
      console.log('Sample result:', JSON.stringify(data.features[0], null, 2));
    }

    if (!data.features || data.features.length === 0) {
      console.log('No results found, trying fallback search...');
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

    // Find the best match with detailed address
    let bestMatch = data.features[0];
    
    // Priority: POI with detailed address components
    for (const feature of data.features) {
      const hasDetailedAddress = feature.context?.some(ctx => 
        ctx.id?.includes('address') || ctx.id?.includes('postcode')
      );
      
      if ((feature.place_type?.includes('poi') || feature.properties?.category) && hasDetailedAddress) {
        bestMatch = feature;
        break;
      }
    }

    console.log('Selected match:', JSON.stringify(bestMatch, null, 2));

    // Build detailed Portuguese address format
    let detailedAddress = bestMatch.place_name;
    
    if (bestMatch.context && bestMatch.context.length > 0) {
      const components = {
        street: null as string | null,
        number: null as string | null,
        postcode: null as string | null,
        locality: null as string | null,
        place: null as string | null
      };
      
      // Extract components from context
      for (const ctx of bestMatch.context) {
        console.log('Processing context:', ctx);
        
        if (ctx.id?.includes('address') || ctx.id?.includes('street')) {
          components.street = ctx.text;
        } else if (ctx.id?.includes('postcode')) {
          components.postcode = ctx.text;
        } else if (ctx.id?.includes('place')) {
          components.place = ctx.text;
        } else if (ctx.id?.includes('locality')) {
          components.locality = ctx.text;
        }
      }
      
      // Try to extract house number from the feature text - FIXED SYNTAX ERROR
      const numberMatch = bestMatch.text?.match(/\b\d+[A-Za-z]?\b/) || 
                         bestMatch.place_name?.match(/\b\d+[A-Za-z]?\b/);
      if (numberMatch) {
        components.number = numberMatch[0];
      }
      
      // Also check properties for address info
      if (bestMatch.properties?.address && !components.street) {
        components.street = bestMatch.properties.address;
      }
      
      console.log('Extracted components:', components);
      
      // Build Portuguese format address: Street Number, Postal Code City, Country
      if (components.street || components.postcode || components.place) {
        const addressParts = [];
        
        // Street with number
        if (components.street) {
          let streetPart = components.street;
          if (components.number && !streetPart.includes(components.number)) {
            streetPart += ` ${components.number}`;
          }
          addressParts.push(streetPart);
        }
        
        // Postal code with city
        if (components.postcode && (components.place || components.locality)) {
          const cityPart = `${components.postcode} ${components.place || components.locality}`;
          addressParts.push(cityPart);
        } else if (components.postcode) {
          addressParts.push(components.postcode);
        } else if (components.place || components.locality) {
          addressParts.push(components.place || components.locality);
        }
        
        // Add Portugal
        addressParts.push('Portugal');
        
        if (addressParts.length > 1) {
          detailedAddress = addressParts.join(', ');
          console.log('Built detailed address:', detailedAddress);
        }
      }
    }

    const result = {
      found: true,
      placeName,
      address: detailedAddress,
      coordinates: bestMatch.geometry.coordinates, // [lng, lat]
      category: bestMatch.properties?.category,
      confidence: bestMatch.relevance
    };

    console.log('Final result:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
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
