import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Radius mapping by time window
const TIME_TO_RADIUS = {
  '30 minutes': 800,
  '1 hour': 1500,
  '1.5 hours': 2200,
  '2+ hours': 3500
};

// Max stops by time window
const TIME_TO_MAX_STOPS = {
  '30 minutes': 1,
  '1 hour': 2,
  '1.5 hours': 3,
  '2+ hours': 4
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, goals, timeWindow } = await req.json();
    
    console.log('=== GPT-Powered Route Generation Pipeline ===');
    console.log('Location:', location);
    console.log('Goals:', goals);
    console.log('Time Window:', timeWindow);

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!googleApiKey) {
      console.error('Google API key not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Google API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Extract coordinates from location input
    let lat, lng;
    if (typeof location === 'object' && location.lat && location.lon) {
      lat = location.lat;
      lng = location.lon;
      console.log('Using provided coordinates:', { lat, lng });
    } else {
      // Geocode string location
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googleApiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        throw new Error(`Could not geocode location: ${location}`);
      }
      
      lat = geocodeData.results[0].geometry.location.lat;
      lng = geocodeData.results[0].geometry.location.lng;
      console.log(`Geocoded ${location} to:`, { lat, lng });
    }

    // Map goals to Google Places types (expanded mapping)
    const goalToTypesMap = {
      'Parks': ['park'],
      'Restaurants': ['restaurant', 'cafe', 'bar', 'bakery'],
      'Museums': ['museum', 'art_gallery'],
      'Sightseeing': ['tourist_attraction', 'point_of_interest'],
      'Culture': ['tourist_attraction', 'point_of_interest'],
      'Architectural landmarks': ['tourist_attraction', 'point_of_interest'],
      'Cafés': ['cafe', 'bakery'],
      'Bars': ['bar', 'night_club'],
      'Nightlife': ['bar', 'night_club'],
      'Work spots': ['library']
    };

    // Get radius and max stops based on time window
    const radius = TIME_TO_RADIUS[timeWindow] || 1500;
    const maxStops = TIME_TO_MAX_STOPS[timeWindow] || 2;
    
    console.log(`Search parameters: radius=${radius}m, maxStops=${maxStops}`);

    // Get unique types for search
    const allTypes = goals.flatMap(goal => goalToTypesMap[goal] || ['point_of_interest']);
    const uniqueTypes = [...new Set(allTypes)];

    // Helper function to normalize Google Places types
    const normalizeType = (googleTypes) => {
      if (googleTypes.includes('restaurant') || googleTypes.includes('cafe') || googleTypes.includes('bakery')) return 'restaurant';
      if (googleTypes.includes('bar') || googleTypes.includes('night_club')) return 'bar';
      if (googleTypes.includes('park')) return 'park';
      if (googleTypes.includes('museum') || googleTypes.includes('art_gallery')) return 'museum';
      return 'attraction';
    };

    // STEP 1: Collect 20-40 candidates from Google Places
    console.log('=== Collecting candidates from Google Places ===');
    const allCandidates = [];
    const seenPlaceIds = new Set();

    for (const placeType of uniqueTypes) {
      try {
        console.log(`Searching for type: ${placeType}`);
        
        // Nearby Search
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${placeType}&key=${googleApiKey}`;
        const nearbyResponse = await fetch(nearbyUrl);
        const nearbyData = await nearbyResponse.json();
        
        console.log(`Google Places nearby search for ${placeType}:`, nearbyData.results?.length || 0, 'results');
        
        if (nearbyData.results) {
          for (const place of nearbyData.results.slice(0, 10)) {
            // Skip duplicates
            if (seenPlaceIds.has(place.place_id)) continue;
            seenPlaceIds.add(place.place_id);
            
            // Basic validation: must have coordinates and name
            if (!place.geometry?.location?.lat || !place.geometry?.location?.lng || !place.name) continue;
            
            allCandidates.push(place);
          }
        }
      } catch (error) {
        console.error(`Error searching for ${placeType}:`, error);
      }
    }

    console.log(`Collected ${allCandidates.length} candidates from Google Places`);

    // STEP 2: Enrich candidates with details
    console.log('=== Enriching candidates with place details ===');
    const enrichedCandidates = [];
    
    for (const place of allCandidates.slice(0, 40)) { // Limit to 40 for performance
      try {
        // Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=url,website,opening_hours,rating,user_ratings_total,photos&key=${googleApiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        const details = detailsData.result || {};
        
        // Build photo URL if available
        let photoUrl = null;
        if (details.photos && details.photos.length > 0) {
          const photoRef = details.photos[0].photo_reference;
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${googleApiKey}`;
        }
        
        const enrichedPlace = {
          name: place.name,
          address: place.vicinity || place.formatted_address || 'Address not available',
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          types: place.types || [],
          typeNormalized: normalizeType(place.types || []),
          webUrl: details.url || details.website,
          photoUrl: photoUrl,
          rating: details.rating || place.rating,
          user_ratings_total: details.user_ratings_total || place.user_ratings_total
        };
        
        enrichedCandidates.push(enrichedPlace);
        
      } catch (error) {
        console.error(`Error enriching place ${place.name}:`, error);
      }
    }

    console.log(`Enriched ${enrichedCandidates.length} candidates`);

    // STEP 3: GPT Selection and Ordering
    console.log('=== Using GPT to select and order best stops ===');
    
    if (enrichedCandidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No valid candidates found',
          places: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalStops = [];

    // If we have fewer candidates than maxStops, just return them all
    if (enrichedCandidates.length <= maxStops) {
      finalStops = enrichedCandidates.map(place => ({
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        type: place.typeNormalized,
        webUrl: place.webUrl || '',
        photoUrl: place.photoUrl || '',
        reason: `${place.typeNormalized} in your area`,
        address: place.address,
        walkingTime: 5
      }));
    } else {
      // Use GPT to select and order the best stops
      try {
        const prompt = `You are a local tour guide AI. Select the best ${maxStops} stops from the following candidates for a ${timeWindow} route based on these user goals: ${goals.join(', ')}.

Starting location: ${lat}, ${lng}

Candidates:
${enrichedCandidates.map(p => `- ${p.name} (${p.typeNormalized}) at ${p.lat}, ${p.lon} - Rating: ${p.rating || 'N/A'} (${p.user_ratings_total || 0} reviews)`).join('\n')}

Requirements:
1. Select exactly ${maxStops} diverse stops that best match the user goals
2. Order them in a logical walking sequence starting near the user's location
3. Ensure variety and interesting experiences
4. Provide a brief reason (1-2 lines) for each selection
5. Estimate walking time between stops (rough haversine distance is fine)

Return ONLY a JSON object in this exact format:
{
  "stops": [
    {
      "name": "Place Name",
      "lat": latitude,
      "lon": longitude, 
      "type": "restaurant|bar|park|museum|attraction",
      "reason": "Brief explanation why this place fits the goals"
    }
  ]
}`;

        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: 'You are a helpful local tour guide. Always respond with valid JSON only.' 
              },
              { 
                role: 'user', 
                content: prompt 
              }
            ],
            max_tokens: 1000,
            temperature: 0.7
          }),
        });

        if (gptResponse.ok) {
          const gptData = await gptResponse.json();
          const gptContent = gptData.choices[0].message.content;
          
          console.log('GPT Response:', gptContent);
          
          try {
            const gptResult = JSON.parse(gptContent);
            
            if (gptResult.stops && Array.isArray(gptResult.stops)) {
              // Enrich GPT selections with full data from candidates
              finalStops = gptResult.stops.map(stop => {
                const candidate = enrichedCandidates.find(c => 
                  c.name === stop.name || 
                  (Math.abs(c.lat - stop.lat) < 0.001 && Math.abs(c.lon - stop.lon) < 0.001)
                );
                
                return {
                  name: stop.name,
                  lat: stop.lat,
                  lon: stop.lon,
                  type: stop.type,
                  webUrl: candidate?.webUrl || '',
                  photoUrl: candidate?.photoUrl || '',
                  reason: stop.reason,
                  address: candidate?.address || 'Address not available',
                  walkingTime: 5 // Will be calculated properly later if needed
                };
              });
              
              console.log(`GPT selected ${finalStops.length} stops`);
            } else {
              throw new Error('Invalid GPT response structure');
            }
          } catch (parseError) {
            console.error('Error parsing GPT response:', parseError);
            throw new Error('Failed to parse GPT response');
          }
        } else {
          throw new Error(`GPT API request failed: ${gptResponse.status}`);
        }
      } catch (gptError) {
        console.error('GPT selection failed:', gptError);
        
        // Fallback: Take top N nearest candidates by goal-matching
        console.log('Using fallback selection method');
        finalStops = enrichedCandidates
          .slice(0, maxStops)
          .map(place => ({
            name: place.name,
            lat: place.lat,
            lon: place.lon,
            type: place.typeNormalized,
            webUrl: place.webUrl || '',
            photoUrl: place.photoUrl || '',
            reason: `${place.typeNormalized} near your location`,
            address: place.address,
            walkingTime: 5
          }));
      }
    }

    console.log(`Returning ${finalStops.length} final stops:`, finalStops.map(s => s.name));

    return new Response(
      JSON.stringify({ 
        success: finalStops.length > 0, 
        places: finalStops,
        source: 'google_places_with_gpt_selection',
        debug: {
          candidatesCollected: allCandidates.length,
          candidatesEnriched: enrichedCandidates.length,
          finalStopsReturned: finalStops.length,
          maxStopsRequested: maxStops,
          searchRadius: radius,
          location: { lat, lng },
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