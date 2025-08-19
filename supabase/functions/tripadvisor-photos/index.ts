import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lisbon bounding box for validation
const LISBON_BBOX = {
  north: 38.8,
  south: 38.6,
  east: -9.0,
  west: -9.3
};

// Visitability configuration
const MIN_RATINGS = 20;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, goals, timeWindow } = await req.json();
    
    console.log('=== Google Places POI Pipeline Request ===');
    console.log('Location:', location);
    console.log('Goals:', goals);
    console.log('Time Window:', timeWindow);

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
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

    // Map goals to Google Places types
    const goalToTypesMap = {
      'Parks': ['park', 'point_of_interest'],
      'Restaurants': ['restaurant', 'cafe', 'bar', 'bakery'],
      'Museums': ['museum', 'art_gallery'],
      'Shopping': ['shopping_mall', 'store'],
      'Nightlife': ['bar', 'night_club'],
      'Entertainment': ['tourist_attraction', 'amusement_park'],
      'Sightseeing': ['tourist_attraction', 'point_of_interest'],
      'Culture': ['museum', 'art_gallery', 'tourist_attraction'],
      'Cafés': ['cafe', 'bakery'],
      'Bars': ['bar', 'night_club'],
      'Architectural landmarks': ['tourist_attraction', 'point_of_interest']
    };

    // Get unique types for search
    const allTypes = goals.flatMap(goal => goalToTypesMap[goal] || ['point_of_interest']);
    const uniqueTypes = [...new Set(allTypes)];

    // Determine number of places based on time window
    const timeToPLacesMap = {
      '30 minutes': 1,
      '1 hour': 2,
      '1.5 hours': 2,
      '2+ hours': 3
    };
    const maxPlaces = timeToPLacesMap[timeWindow] || 2;

    // Geocode location first
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googleApiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      throw new Error(`Could not geocode location: ${location}`);
    }
    
    const { lat, lng } = geocodeData.results[0].geometry.location;
    console.log(`Geocoded ${location} to:`, { lat, lng });

    // Helper functions
    const isInLisbon = (lat, lng) => {
      return lat >= LISBON_BBOX.south && lat <= LISBON_BBOX.north && 
             lng >= LISBON_BBOX.west && lng <= LISBON_BBOX.east;
    };

    const normalizeType = (googleTypes) => {
      if (googleTypes.includes('restaurant') || googleTypes.includes('cafe') || googleTypes.includes('bakery')) return 'restaurant';
      if (googleTypes.includes('bar') || googleTypes.includes('night_club')) return 'bar';
      if (googleTypes.includes('cafe') || googleTypes.includes('bakery')) return 'cafe';
      if (googleTypes.includes('park')) return 'park';
      if (googleTypes.includes('museum') || googleTypes.includes('art_gallery')) return 'museum';
      return 'attraction';
    };

    const isValidPlace = (place) => {
      // Must have coordinates
      if (!place.geometry?.location?.lat || !place.geometry?.location?.lng) return false;
      
      // Must be in Lisbon
      if (!isInLisbon(place.geometry.location.lat, place.geometry.location.lng)) return false;
      
      // Must have sufficient ratings
      if ((place.user_ratings_total || 0) < MIN_RATINGS) return false;
      
      // Must intersect with our type whitelist
      const allowedTypes = ['restaurant', 'cafe', 'bar', 'bakery', 'tourist_attraction', 'museum', 
                           'art_gallery', 'park', 'point_of_interest', 'library', 'university'];
      if (!place.types?.some(type => allowedTypes.includes(type))) return false;
      
      // Exclude agencies/experiences/operators
      const excludeKeywords = ['agency', 'experience', 'operator', 'tour', 'company'];
      const nameAndTypes = `${place.name || ''} ${place.types?.join(' ') || ''}`.toLowerCase();
      if (excludeKeywords.some(keyword => nameAndTypes.includes(keyword))) return false;
      
      // Type-specific validation
      const placeTypes = place.types || [];
      const hasRestaurantType = placeTypes.some(t => ['restaurant', 'cafe', 'bar', 'bakery'].includes(t));
      const hasAttractionType = placeTypes.some(t => ['tourist_attraction', 'museum', 'art_gallery', 'park', 'point_of_interest'].includes(t));
      
      // For restaurants: must have restaurant type
      if (goals.some(g => ['Restaurants', 'Cafés', 'Bars', 'Nightlife'].includes(g)) && 
          normalizeType(placeTypes) === 'restaurant' && !hasRestaurantType) return false;
      
      // For attractions: must have attraction type  
      if (goals.some(g => ['Museums', 'Parks', 'Sightseeing', 'Culture', 'Architectural landmarks'].includes(g)) && 
          normalizeType(placeTypes) === 'attraction' && !hasAttractionType) return false;
      
      return true;
    };

    const searchGooglePlaces = async (radius = 1500) => {
      console.log(`=== Google Places Search (radius: ${radius}m) ===`);
      
      const allPlaces = [];
      
      for (const placeType of uniqueTypes) {
        try {
          console.log(`Searching for type: ${placeType}`);
          
          // Nearby Search
          const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${placeType}&key=${googleApiKey}`;
          const nearbyResponse = await fetch(nearbyUrl);
          const nearbyData = await nearbyResponse.json();
          
          console.log(`Google Places nearby search for ${placeType}:`, nearbyData.results?.length || 0, 'results');
          
          if (nearbyData.results) {
            for (const place of nearbyData.results.slice(0, 5)) {
              if (isValidPlace(place)) {
                allPlaces.push(place);
                console.log(`Added valid place: ${place.name}`);
              } else {
                console.log(`Filtered out: ${place.name} (${place.user_ratings_total || 0} ratings)`);
              }
            }
          }
        } catch (error) {
          console.error(`Error searching for ${placeType}:`, error);
        }
      }
      
      return allPlaces;
    };

    const enrichPlaceDetails = async (place) => {
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
        
        return {
          name: place.name,
          address: place.vicinity || place.formatted_address || `${location}, Portugal`,
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          type: normalizeType(place.types || []),
          rating: details.rating || place.rating,
          user_ratings_total: details.user_ratings_total || place.user_ratings_total,
          webUrl: details.url || details.website,
          photoUrl: photoUrl,
          walkingTime: Math.floor(Math.random() * 10) + 5, // Random 5-15 minutes for now
          reason: `Popular ${normalizeType(place.types || [])} in ${location}`
        };
      } catch (error) {
        console.error(`Error enriching place ${place.name}:`, error);
        return null;
      }
    };

    // Main search with progressive radius expansion
    let validPlaces = [];
    let currentRadius = 1500;
    const maxRadius = 5000;
    
    while (validPlaces.length < 2 && currentRadius <= maxRadius) {
      const foundPlaces = await searchGooglePlaces(currentRadius);
      
      // Enrich places with details
      for (const place of foundPlaces) {
        const enriched = await enrichPlaceDetails(place);
        if (enriched) {
          validPlaces.push(enriched);
        }
      }
      
      console.log(`Radius ${currentRadius}m: Found ${foundPlaces.length} places, ${validPlaces.length} valid after enrichment`);
      
      if (validPlaces.length < 2) {
        currentRadius += 1500;
        console.log(`Expanding radius to ${currentRadius}m`);
      }
    }

    // Remove duplicates and limit results
    const seenNames = new Set();
    const finalPlaces = validPlaces
      .filter(place => {
        if (seenNames.has(place.name)) return false;
        seenNames.add(place.name);
        return true;
      })
      .slice(0, maxPlaces);

    console.log(`Returning ${finalPlaces.length} places from Google Places:`, finalPlaces.map(p => p.name));

    // TripAdvisor fallback/enrichment (only if Google Places returns insufficient results)
    if (finalPlaces.length < maxPlaces) {
      console.log('=== Google Places returned insufficient results, trying TripAdvisor enrichment ===');
      
      const tripAdvisorApiKey = Deno.env.get('TRIPADVISOR_API_KEY');
      if (tripAdvisorApiKey) {
        try {
          // Simple TripAdvisor search for enrichment
          const searchUrl = 'https://api.content.tripadvisor.com/api/v1/location/search';
          const searchParams = new URLSearchParams({
            key: tripAdvisorApiKey,
            searchQuery: `${location}, Portugal`,
            category: 'attractions',
            language: 'en'
          });

          const tripAdvisorHeaders = {
            'Referer': 'https://turnright-city.lovable.app',
            'User-Agent': 'TurnRight-MVP/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          };

          const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
            method: 'GET',
            headers: tripAdvisorHeaders
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log(`TripAdvisor enrichment: ${searchData.data?.length || 0} additional places found`);
            
            if (searchData.data && searchData.data.length > 0) {
              const remainingSlots = maxPlaces - finalPlaces.length;
              for (const place of searchData.data.slice(0, remainingSlots)) {
                const enrichedPlace = {
                  name: place.name || 'Unknown Place',
                  address: place.address_obj?.street1 || `${location}, Portugal`,
                  lat: undefined, // TripAdvisor doesn't provide coordinates in search
                  lon: undefined,
                  type: 'attraction',
                  rating: undefined,
                  user_ratings_total: undefined,
                  webUrl: undefined,
                  photoUrl: undefined,
                  walkingTime: Math.floor(Math.random() * 10) + 5,
                  reason: `TripAdvisor recommendation in ${location}`
                };
                finalPlaces.push(enrichedPlace);
                console.log(`Added TripAdvisor place: ${enrichedPlace.name}`);
              }
            }
          }
        } catch (error) {
          console.error('TripAdvisor enrichment error:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: finalPlaces.length > 0, 
        places: finalPlaces,
        source: finalPlaces.length > validPlaces.length ? 'google_places_with_tripadvisor_enrichment' : 'google_places',
        debug: {
          googlePlacesFound: validPlaces.length,
          tripAdvisorEnrichment: finalPlaces.length - validPlaces.length,
          finalPlacesReturned: finalPlaces.length,
          maxPlacesRequested: maxPlaces,
          location,
          goals,
          timeWindow,
          radiusExpansion: currentRadius > 1500,
          maxRadiusReached: currentRadius > maxRadius
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