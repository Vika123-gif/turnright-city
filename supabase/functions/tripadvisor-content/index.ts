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
    const { location, goals, maxResults = 3 } = await req.json();
    const tripAdvisorApiKey = Deno.env.get('TRIPADVISOR_API_KEY');

    if (!tripAdvisorApiKey) {
      throw new Error('TripAdvisor API key not found');
    }

    console.log("=== TripAdvisor Content API called ===");
    console.log("Location:", location);
    console.log("Goals:", goals);
    console.log("Max results:", maxResults);

    // Map goals to TripAdvisor categories
    const goalToCategory: Record<string, string[]> = {
      restaurants: ['restaurants'],
      coffee: ['restaurants'],
      work: ['attractions'], // Coworking spaces might be listed as attractions
      museums: ['attractions'],
      parks: ['attractions'],
      monuments: ['attractions']
    };

    const places: any[] = [];

    // Search for each goal category
    for (const goal of goals) {
      const categories = goalToCategory[goal] || ['attractions'];
      
      for (const category of categories) {
        try {
          // First, search for locations in the area
          const searchResponse = await fetch(
            `https://api.content.tripadvisor.com/api/v1/location/search?key=${tripAdvisorApiKey}&searchQuery=${encodeURIComponent(location)}&language=en`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (!searchResponse.ok) {
            console.error(`TripAdvisor search failed for ${location}:`, await searchResponse.text());
            continue;
          }

          const searchData = await searchResponse.json();
          console.log(`TripAdvisor search results for ${location}:`, searchData);

          if (!searchData.data || searchData.data.length === 0) {
            console.warn(`No TripAdvisor locations found for ${location}`);
            continue;
          }

          // Get the first location ID
          const locationId = searchData.data[0].location_id;
          console.log(`Using TripAdvisor location ID: ${locationId}`);

          // Get nearby places for the category
          const nearbyResponse = await fetch(
            `https://api.content.tripadvisor.com/api/v1/location/${locationId}/nearby_search?key=${tripAdvisorApiKey}&category=${category}&language=en&limit=${maxResults}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (!nearbyResponse.ok) {
            console.error(`TripAdvisor nearby search failed for category ${category}:`, await nearbyResponse.text());
            continue;
          }

          const nearbyData = await nearbyResponse.json();
          console.log(`TripAdvisor nearby results for ${category}:`, nearbyData);

          if (nearbyData.data && Array.isArray(nearbyData.data)) {
            // Convert TripAdvisor places to our format
            for (const place of nearbyData.data.slice(0, maxResults - places.length)) {
              const formattedPlace = {
                name: place.name,
                address: place.address_obj ? 
                  `${place.address_obj.street1 || ''} ${place.address_obj.city || ''} ${place.address_obj.country || ''}`.trim() :
                  `${place.name}, ${location}`,
                walkingTime: Math.floor(Math.random() * 10) + 5, // Random walking time 5-15 minutes
                type: goal,
                reason: place.description || `Popular ${goal} spot in ${location}`,
                coordinates: place.latitude && place.longitude ? 
                  [parseFloat(place.longitude), parseFloat(place.latitude)] : undefined,
                lat: place.latitude ? parseFloat(place.latitude) : undefined,
                lon: place.longitude ? parseFloat(place.longitude) : undefined,
                photoUrl: place.photo?.images?.medium?.url || undefined,
                rating: place.rating,
                source: 'tripadvisor'
              };
              
              places.push(formattedPlace);
              
              if (places.length >= maxResults) {
                break;
              }
            }
          }

          if (places.length >= maxResults) {
            break;
          }
        } catch (error) {
          console.error(`Error fetching TripAdvisor data for ${goal}/${category}:`, error);
          continue;
        }
      }

      if (places.length >= maxResults) {
        break;
      }
    }

    console.log(`TripAdvisor found ${places.length} places`);

    return new Response(
      JSON.stringify({
        places,
        metadata: {
          location,
          goals,
          maxResults,
          actualResults: places.length,
          source: 'tripadvisor'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in tripadvisor-content function:', error);
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