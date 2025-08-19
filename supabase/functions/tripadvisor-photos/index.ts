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

      console.log(`Searching TripAdvisor for ${category} in:`, location);
      
      const searchResponse = await fetch(`${searchUrl}?${searchParams}`);
      
      if (!searchResponse.ok) {
        console.error(`TripAdvisor search failed for ${category}:`, searchResponse.status);
        continue;
      }

      const searchData = await searchResponse.json();
      console.log(`TripAdvisor search results for ${category}:`, searchData.data?.length || 0, 'places found');

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

            const detailsResponse = await fetch(`${detailsUrl}?${detailsParams}`);
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

            const photosResponse = await fetch(`${photosUrl}?${photosParams}`);
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

    return new Response(
      JSON.stringify({ success: true, places: finalPlaces }),
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