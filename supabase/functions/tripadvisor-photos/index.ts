import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeName, location } = await req.json();
    
    console.log('=== TripAdvisor Photos Request ===');
    console.log('Place name:', placeName);
    console.log('Location:', location);

    const tripAdvisorApiKey = Deno.env.get('TRIPADVISOR_API_KEY');
    if (!tripAdvisorApiKey) {
      console.error('TripAdvisor API key not found');
      return new Response(
        JSON.stringify({ success: false, error: 'TripAdvisor API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Search for the place using TripAdvisor Content API
    const searchUrl = 'https://api.content.tripadvisor.com/api/v1/location/search';
    const searchParams = new URLSearchParams({
      key: tripAdvisorApiKey,
      searchQuery: `${placeName} ${location}`,
      category: 'attractions',
      language: 'en'
    });

    console.log('Searching TripAdvisor for:', `${placeName} ${location}`);
    
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`);
    
    if (!searchResponse.ok) {
      console.error('TripAdvisor search failed:', searchResponse.status, await searchResponse.text());
      return new Response(
        JSON.stringify({ success: false, error: 'TripAdvisor search failed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const searchData = await searchResponse.json();
    console.log('TripAdvisor search results:', JSON.stringify(searchData, null, 2));

    if (!searchData.data || searchData.data.length === 0) {
      console.log('No TripAdvisor results found for:', placeName);
      return new Response(
        JSON.stringify({ success: true, photoUrl: null }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the first location result
    const locationId = searchData.data[0].location_id;
    console.log('Found TripAdvisor location ID:', locationId);

    // Get photos for this location
    const photosUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/photos`;
    const photosParams = new URLSearchParams({
      key: tripAdvisorApiKey,
      language: 'en'
    });

    const photosResponse = await fetch(`${photosUrl}?${photosParams}`);
    
    if (!photosResponse.ok) {
      console.error('TripAdvisor photos request failed:', photosResponse.status);
      return new Response(
        JSON.stringify({ success: true, photoUrl: null }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const photosData = await photosResponse.json();
    console.log('TripAdvisor photos data:', JSON.stringify(photosData, null, 2));

    let photoUrl = null;
    if (photosData.data && photosData.data.length > 0) {
      // Get the first photo's medium-sized image
      const firstPhoto = photosData.data[0];
      if (firstPhoto.images && firstPhoto.images.medium) {
        photoUrl = firstPhoto.images.medium.url;
        console.log('Found photo URL:', photoUrl);
      }
    }

    return new Response(
      JSON.stringify({ success: true, photoUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('TripAdvisor photos function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});