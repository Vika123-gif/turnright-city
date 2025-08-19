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
    const { location, goals, timeWindow } = await req.json();
    
    console.log('=== TripAdvisor Route Generation Request ===');
    console.log('Location:', location);
    console.log('Goals:', goals);
    console.log('Time Window:', timeWindow);

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

    // Map goals to TripAdvisor categories
    const goalToCategoryMap = {
      'Parks': 'attractions',
      'Restaurants': 'restaurants',
      'Museums': 'attractions',
      'Shopping': 'attractions',
      'Nightlife': 'restaurants',
      'Entertainment': 'attractions',
      'Sightseeing': 'attractions',
      'Culture': 'attractions'
    };

    const searchCategories = goals.map(goal => goalToCategoryMap[goal] || 'attractions');
    const uniqueCategories = [...new Set(searchCategories)];

    // Determine number of places based on time window
    const timeToPLacesMap = {
      '30 minutes': 1,
      '1 hour': 2,
      '1.5 hours': 2,
      '2+ hours': 3
    };
    const maxPlaces = timeToPLacesMap[timeWindow] || 2;

    const allPlaces = [];

    // Search for places in each category
    for (const category of uniqueCategories) {
      const searchUrl = 'https://api.content.tripadvisor.com/api/v1/location/search';
      const searchParams = new URLSearchParams({
        key: tripAdvisorApiKey,
        searchQuery: `${location}, Portugal`,
        category: category,
        language: 'en'
      });

      // Headers required for TripAdvisor API
      const tripAdvisorHeaders = {
        'Referer': 'https://turnright-city.lovable.app',
        'User-Agent': 'TurnRight-MVP/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      console.log(`=== TripAdvisor API Call Debug ===`);
      console.log(`URL: ${searchUrl}?${searchParams}`);
      console.log(`Category: ${category}, Location: ${location}`);
      console.log(`API Key present:`, tripAdvisorApiKey ? 'YES' : 'NO');
      console.log(`API Key length:`, tripAdvisorApiKey?.length || 0);
      console.log(`Headers being sent:`, JSON.stringify(tripAdvisorHeaders, null, 2));
      
      const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
        method: 'GET',
        headers: tripAdvisorHeaders
      });
      
      console.log(`Response status: ${searchResponse.status}`);
      console.log(`Response headers:`, Object.fromEntries(searchResponse.headers.entries()));
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`TripAdvisor search failed for ${category}:`);
        console.error(`Status: ${searchResponse.status}`);
        console.error(`Status Text: ${searchResponse.statusText}`);
        console.error(`Error Response:`, errorText);
        
        // Try to parse error as JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          console.error(`Parsed error:`, errorJson);
        } catch (e) {
          console.error(`Raw error text:`, errorText);
        }
        continue;
      }

      const searchData = await searchResponse.json();
      console.log(`TripAdvisor search results for ${category}:`, searchData.data?.length || 0, 'places found');
      console.log(`Full search response structure:`, JSON.stringify(searchData, null, 2));

      if (searchData.data && searchData.data.length > 0) {
        // Process each location to get detailed info
        for (const place of searchData.data.slice(0, Math.ceil(maxPlaces / uniqueCategories.length))) {
          try {
            const locationId = place.location_id;
            
            // Get detailed location info
            const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details`;
            const detailsParams = new URLSearchParams({
              key: tripAdvisorApiKey,
              language: 'en'
            });

            const detailsResponse = await fetch(`${detailsUrl}?${detailsParams}`, {
              method: 'GET',
              headers: tripAdvisorHeaders
            });
            let detailsData = null;
            if (detailsResponse.ok) {
              detailsData = await detailsResponse.json();
            }

            // Get photos
            const photosUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/photos`;
            const photosParams = new URLSearchParams({
              key: tripAdvisorApiKey,
              language: 'en'
            });

            const photosResponse = await fetch(`${photosUrl}?${photosParams}`, {
              method: 'GET',
              headers: tripAdvisorHeaders
            });
            let photoUrl = null;
            if (photosResponse.ok) {
              const photosData = await photosResponse.json();
              if (photosData.data && photosData.data.length > 0) {
                const firstPhoto = photosData.data[0];
                if (firstPhoto.images && firstPhoto.images.medium) {
                  photoUrl = firstPhoto.images.medium.url;
                }
              }
            }

            // Create place object
            const placeObj = {
              name: place.name || 'Unknown Place',
              address: detailsData?.address?.street1 || place.address_obj?.street1 || `${location}, Portugal`,
              walkingTime: Math.floor(Math.random() * 10) + 5, // Random 5-15 minutes
              type: category === 'restaurants' ? 'restaurant' : 'attraction',
              reason: `Great ${category.slice(0, -1)} in ${location}`,
              coordinates: detailsData?.latitude && detailsData?.longitude ? 
                [parseFloat(detailsData.longitude), parseFloat(detailsData.latitude)] : undefined,
              lat: detailsData?.latitude ? parseFloat(detailsData.latitude) : undefined,
              lon: detailsData?.longitude ? parseFloat(detailsData.longitude) : undefined,
              photoUrl: photoUrl,
              rating: detailsData?.rating ? parseFloat(detailsData.rating) : undefined
            };

            allPlaces.push(placeObj);
            console.log(`Added place: ${placeObj.name}`);

          } catch (error) {
            console.error(`Error processing place ${place.name}:`, error);
          }
        }
      }
    }

    // Limit to maxPlaces and shuffle for variety
    const finalPlaces = allPlaces
      .sort(() => Math.random() - 0.5)
      .slice(0, maxPlaces);

    console.log(`Returning ${finalPlaces.length} places:`, finalPlaces.map(p => p.name));

    // If no places found from TripAdvisor, try Google Places as fallback
    if (finalPlaces.length === 0) {
      console.log('=== TripAdvisor returned no results, trying Google Places fallback ===');
      
      try {
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
        if (!googleApiKey) {
          console.error('Google API key not found for fallback');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No places found from TripAdvisor and Google API key not configured for fallback',
              debug: { 
                tripAdvisorAttempted: true,
                googleFallbackAttempted: false,
                location,
                goals,
                timeWindow
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404
            }
          );
        }

        // Use Google Places as fallback
        const response = await fetch('https://gwwqfoplhhtyjkrhazbt.supabase.co/functions/v1/google-places', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({ location, goals, timeWindow })
        });

        if (response.ok) {
          const googleData = await response.json();
          console.log('Google Places fallback successful:', googleData.places?.length || 0, 'places');
          
          // Convert Google Places format to our format
          const googlePlaces = (googleData.places || []).map(place => ({
            ...place,
            reason: `Found via Google Places (TripAdvisor fallback)`
          }));

          return new Response(
            JSON.stringify({ 
              success: true, 
              places: googlePlaces,
              source: 'google_places_fallback',
              debug: {
                tripAdvisorFailed: true,
                googleFallbackUsed: true
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } else {
          console.error('Google Places fallback also failed:', response.status);
        }
      } catch (fallbackError) {
        console.error('Google Places fallback error:', fallbackError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: finalPlaces.length > 0, 
        places: finalPlaces,
        source: 'tripadvisor',
        debug: {
          totalCategoriesSearched: uniqueCategories.length,
          totalPlacesFound: allPlaces.length,
          finalPlacesReturned: finalPlaces.length,
          maxPlacesRequested: maxPlaces,
          location,
          goals,
          timeWindow
        }
      }),
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