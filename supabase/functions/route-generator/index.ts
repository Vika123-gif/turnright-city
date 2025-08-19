import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, goals, timeWindow, regenerationAttempt = 0, maxPlaces = 2 } = await req.json();

    console.log("=== Route Generator called ===");
    console.log("Location:", location);
    console.log("Goals:", goals);
    console.log("TimeWindow:", timeWindow);
    console.log("Regeneration attempt:", regenerationAttempt);
    console.log("Max places:", maxPlaces);

    // Get nearby places from Google Places based on goals
    const googlePlacesResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/google-places`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        location,
        goals,
        timeWindow: parseInt(timeWindow) || 60
      }),
    });

    if (!googlePlacesResponse.ok) {
      const errorText = await googlePlacesResponse.text();
      console.error("Google Places API error:", errorText);
      throw new Error(`Google Places API failed: ${errorText}`);
    }

    const googlePlacesData = await googlePlacesResponse.json();
    console.log("Google Places response:", googlePlacesData);

    let places = googlePlacesData.places || [];

    // If we don't have enough places or this is a regeneration, get TripAdvisor content
    if (places.length < maxPlaces || regenerationAttempt > 0) {
      console.log("Fetching additional places from TripAdvisor...");
      
      try {
        const tripAdvisorResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/tripadvisor-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            location,
            goals,
            maxResults: maxPlaces - places.length + regenerationAttempt
          }),
        });

        if (tripAdvisorResponse.ok) {
          const tripAdvisorData = await tripAdvisorResponse.json();
          console.log("TripAdvisor response:", tripAdvisorData);
          
          // Merge TripAdvisor places with Google Places
          if (tripAdvisorData.places && Array.isArray(tripAdvisorData.places)) {
            places = [...places, ...tripAdvisorData.places];
          }
        } else {
          console.warn("TripAdvisor API failed, continuing with Google Places only");
        }
      } catch (error) {
        console.warn("TripAdvisor API error:", error);
        // Continue with Google Places only
      }
    }

    // Ensure we don't exceed maxPlaces
    places = places.slice(0, maxPlaces);

    // If regeneration, try to provide different results
    if (regenerationAttempt > 0 && places.length > 1) {
      // Shuffle array to provide different order
      for (let i = places.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [places[i], places[j]] = [places[j], places[i]];
      }
    }

    console.log("Final places:", places);

    return new Response(
      JSON.stringify({
        places,
        metadata: {
          location,
          goals,
          timeWindow,
          regenerationAttempt,
          placesCount: places.length,
          sources: ['google-places', 'tripadvisor']
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in route-generator function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        places: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});