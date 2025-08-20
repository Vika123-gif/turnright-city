import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Average time spent at different place types (in minutes)
const PLACE_TYPE_DURATION = {
  'restaurant': 60,  // Restaurants
  'cafe': 30,        // Cafés  
  'bar': 45,         // Bars
  'attraction': 20,  // Viewpoints/Architectural landmarks (average)
  'park': 30,        // Parks
  'museum': 60,      // Museums
  'coworking': 60,   // Coworking
  'bakery': 5,       // Bakery
  'specialty_coffee': 20 // Specialty coffee
};

// More specific type duration mapping
const SPECIFIC_TYPE_DURATION = {
  'tourist_attraction': 20,  // Viewpoints
  'point_of_interest': 15,   // Architectural landmarks
  'library': 60,             // Coworking spaces
  'night_club': 45          // Bars/Nightlife
};

// Function to get visit duration for a place type
function getPlaceVisitDuration(placeTypes) {
  // Check specific types first
  for (const type of placeTypes) {
    if (SPECIFIC_TYPE_DURATION[type]) {
      return SPECIFIC_TYPE_DURATION[type];
    }
  }
  
  // Check general types
  if (placeTypes.includes('restaurant') || placeTypes.includes('cafe') || placeTypes.includes('bakery')) {
    if (placeTypes.includes('bakery')) return PLACE_TYPE_DURATION.bakery;
    if (placeTypes.includes('restaurant')) return PLACE_TYPE_DURATION.restaurant;
    return PLACE_TYPE_DURATION.cafe;
  }
  if (placeTypes.includes('bar') || placeTypes.includes('night_club')) return PLACE_TYPE_DURATION.bar;
  if (placeTypes.includes('park')) return PLACE_TYPE_DURATION.park;
  if (placeTypes.includes('museum') || placeTypes.includes('art_gallery')) return PLACE_TYPE_DURATION.museum;
  if (placeTypes.includes('library')) return PLACE_TYPE_DURATION.coworking;
  
  // Default for attractions/viewpoints
  return PLACE_TYPE_DURATION.attraction;
}

// Function to calculate optimal number of stops based on total available time
function calculateOptimalStops(timeMinutes, candidatePlaces, startLat, startLng) {
  if (!candidatePlaces || candidatePlaces.length === 0) return [];
  
  // Sort candidates by distance from start for initial ordering
  const sortedCandidates = candidatePlaces.sort((a, b) => {
    const distA = calculateDistance(startLat, startLng, a.lat, a.lon);
    const distB = calculateDistance(startLat, startLng, b.lat, b.lon);
    return distA - distB;
  });
  
  const selectedStops = [];
  let remainingTime = timeMinutes;
  
  // Always include walking time from start to first location
  if (sortedCandidates.length > 0) {
    const firstStop = sortedCandidates[0];
    const walkingTimeToFirst = estimateWalkingTime(
      calculateDistance(startLat, startLng, firstStop.lat, firstStop.lon)
    );
    const visitDuration = getPlaceVisitDuration(firstStop.types || []);
    
    if (walkingTimeToFirst + visitDuration <= remainingTime) {
      selectedStops.push(firstStop);
      remainingTime -= (walkingTimeToFirst + visitDuration);
    }
  }
  
  // Add additional stops while time permits
  for (let i = 1; i < sortedCandidates.length && selectedStops.length < 8; i++) {
    const candidate = sortedCandidates[i];
    const lastStop = selectedStops[selectedStops.length - 1];
    
    // Calculate walking time from last stop to this candidate
    const walkingTime = estimateWalkingTime(
      calculateDistance(lastStop.lat, lastStop.lon, candidate.lat, candidate.lon)
    );
    const visitDuration = getPlaceVisitDuration(candidate.types || []);
    
    // Check if we have enough time for walking + visit + buffer
    const totalTimeNeeded = walkingTime + visitDuration + 5; // 5 min buffer
    
    if (totalTimeNeeded <= remainingTime) {
      selectedStops.push(candidate);
      remainingTime -= totalTimeNeeded;
    }
  }
  
  return selectedStops;
}

// Haversine distance formula for walking time
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distance in meters
}

function estimateWalkingTime(distance) {
  const walkingSpeed = 80; // Meters per minute (4.8 km/h average)
  return Math.round(distance / walkingSpeed);
}

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
    console.log('Environment check - OpenAI key available:', !!Deno.env.get('OPENAI_API_KEY'));
    console.log('Environment check - Google API key available:', !!Deno.env.get('GOOGLE_API_KEY'));

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Google API key length:', googleApiKey ? googleApiKey.length : 'null');
    console.log('OpenAI API key length:', openaiApiKey ? openaiApiKey.length : 'null');
    
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
      console.log('Geocoding URL:', geocodeUrl);
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      console.log('Geocode response:', JSON.stringify(geocodeData, null, 2));
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        console.error('Geocoding failed:', geocodeData);
        throw new Error(`Could not geocode location: ${location}. Status: ${geocodeData.status}`);
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
      'Coworking': ['library', 'cafe'],
      'Bakery': ['bakery'],
      'Specialty coffee': ['cafe'],
      'Viewpoints': ['tourist_attraction', 'point_of_interest']
    };

    // Parse time window to get minutes
    let timeMinutes;
    if (typeof timeWindow === 'number') {
      timeMinutes = timeWindow;
    } else if (typeof timeWindow === 'string') {
      // Legacy support for string time windows
      const timeMap = {
        '1h': 60,
        '3h': 180,
        '5h': 300,
        'Full day': 480,
        '30 minutes': 30,
        '1 hour': 60,
        '1.5 hours': 90,
        '2+ hours': 120
      };
      timeMinutes = timeMap[timeWindow] || 60;
    } else {
      timeMinutes = 60; // Default to 1 hour
    }

    console.log(`Time available: ${timeMinutes} minutes`);

    // Calculate dynamic search radius based on available time (more time = wider search)
    const radius = Math.min(3000, Math.max(800, timeMinutes * 6)); // 6m per minute of available time
    
    console.log(`Search parameters: radius=${radius}m, timeAvailable=${timeMinutes}min`);

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

    // STEP 3: Calculate optimal stops based on time constraints
    console.log('=== Calculating optimal stops based on time constraints ===');
    
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

    // Use the new time-based calculation
    const optimalStops = calculateOptimalStops(timeMinutes, enrichedCandidates, lat, lng);
    
    console.log(`Selected ${optimalStops.length} optimal stops that fit within ${timeMinutes} minutes`);

    // Convert to final format with enriched data
    const finalStops = optimalStops.map(place => ({
      name: place.name,
      lat: place.lat,
      lon: place.lon,
      type: place.typeNormalized,
      webUrl: place.webUrl || '',
      photoUrl: place.photoUrl || '',
      reason: `${place.typeNormalized} - ${getPlaceVisitDuration(place.types || [])} min visit`,
      address: place.address,
      walkingTime: 5, // Will be calculated properly in next step
      visitDuration: getPlaceVisitDuration(place.types || [])
    }));

    // STEP 4: Calculate walking times and generate map route
    console.log('=== Calculating walking times and generating map route ===');
    
    let mapUrl = null;
    let totalWalkingTime = 0;
    
    if (finalStops.length > 0) {
      try {
        // Calculate walking times between stops
        if (finalStops.length > 1) {
          // Add walking time from start to first stop
          const distToFirst = calculateDistance(lat, lng, finalStops[0].lat, finalStops[0].lon);
          finalStops[0].walkingTimeFromPrevious = estimateWalkingTime(distToFirst);
          totalWalkingTime += finalStops[0].walkingTimeFromPrevious;

          // Calculate walking times between consecutive stops
          for (let i = 1; i < finalStops.length; i++) {
            const dist = calculateDistance(
              finalStops[i-1].lat, 
              finalStops[i-1].lon, 
              finalStops[i].lat, 
              finalStops[i].lon
            );
            finalStops[i].walkingTimeFromPrevious = estimateWalkingTime(dist);
            totalWalkingTime += finalStops[i].walkingTimeFromPrevious;
          }
        } else {
          // Single stop - just calculate time from start
          const distToFirst = calculateDistance(lat, lng, finalStops[0].lat, finalStops[0].lon);
          finalStops[0].walkingTimeFromPrevious = estimateWalkingTime(distToFirst);
          totalWalkingTime += finalStops[0].walkingTimeFromPrevious;
        }

        // Generate Google Maps URL for walking directions
        if (finalStops.length > 1) {
          const origin = `${lat},${lng}`;
          const destination = `${finalStops[finalStops.length - 1].lat},${finalStops[finalStops.length - 1].lon}`;
          const waypoints = finalStops.slice(0, -1).map(s => `${s.lat},${s.lon}`).join('|');
          
          mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=walking`;
        } else if (finalStops.length === 1) {
          // Single destination
          mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${finalStops[0].lat},${finalStops[0].lon}&travelmode=walking`;
        }
        
        console.log(`Total walking time: ${totalWalkingTime} minutes`);
        console.log(`Map URL generated: ${mapUrl}`);
        
      } catch (error) {
        console.error('Error calculating walking times or generating map route:', error);
      }
    }

    console.log(`Returning ${finalStops.length} final stops:`, finalStops.map(s => s.name));

    return new Response(
      JSON.stringify({ 
        success: finalStops.length > 0, 
        places: finalStops,
        mapUrl,
        totalWalkingTime,
        source: 'google_places_with_time_optimization',
        debug: {
          candidatesCollected: allCandidates.length,
          candidatesEnriched: enrichedCandidates.length,
          finalStopsReturned: finalStops.length,
          timeAvailableMinutes: timeMinutes,
          searchRadius: radius,
          totalWalkingTime,
          totalVisitTime: finalStops.reduce((sum, stop) => sum + (stop.visitDuration || 0), 0),
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