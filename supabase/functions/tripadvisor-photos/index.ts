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

// Function to generate interesting descriptions for places
function generatePlaceDescription(place: any, details: any, normalizedType: any) {
  let description = '';
  
  // Use editorial summary if available
  if (details.editorial_summary?.overview) {
    description = details.editorial_summary.overview;
  } else {
    // Generate description based on type
    switch (normalizedType) {
      case 'museum':
        description = `A cultural institution featuring exhibitions and collections. Perfect for exploring art, history, and culture.`;
        break;
      case 'park':
        description = `A green space ideal for relaxation, walking, and enjoying nature in the city.`;
        break;
      case 'restaurant':
        description = `Local dining experience offering authentic flavors and cuisine.`;
        break;
      case 'bar':
        description = `Popular spot for drinks and socializing with locals and visitors.`;
        break;
      case 'attraction':
        description = `Notable landmark and point of interest worth visiting for its unique character.`;
        break;
      default:
        description = `Interesting location that offers a unique local experience.`;
    }
  }
  
  // Add rating information if available
  if (details.rating && details.user_ratings_total) {
    description += ` Rated ${details.rating}/5 by ${details.user_ratings_total.toLocaleString()} visitors.`;
  }
  
  return description;
}

// Function to generate ticket price information
function generateTicketPriceInfo(details: any, normalizedType: any) {
  const priceLevel = details.price_level;
  
  // Generate price info based on type and price level
  if (normalizedType === 'museum') {
    switch (priceLevel) {
      case 0: return 'Free admission';
      case 1: return 'Budget-friendly admission (under €10)';
      case 2: return 'Moderate admission (€10-20)';
      case 3: return 'Higher admission (€20-35)';
      case 4: return 'Premium admission (€35+)';
      default: return 'Check website for current ticket prices';
    }
  }
  
  if (normalizedType === 'restaurant') {
    switch (priceLevel) {
      case 0: return 'Very affordable dining';
      case 1: return 'Budget dining (€5-15 per meal)';
      case 2: return 'Mid-range dining (€15-35 per meal)';
      case 3: return 'Upscale dining (€35-60 per meal)';
      case 4: return 'Fine dining (€60+ per meal)';
      default: return 'Price range varies';
    }
  }
  
  if (normalizedType === 'attraction') {
    switch (priceLevel) {
      case 0: return 'Free to visit';
      case 1: return 'Low cost attraction';
      case 2: return 'Moderate entrance fee';
      case 3: return 'Higher entrance fee';
      case 4: return 'Premium attraction pricing';
      default: return 'Check for entrance fees';
    }
  }
  
  return null; // No price info for parks, bars, etc.
}

// Function to get visit duration for a place type
function getPlaceVisitDuration(placeTypes: any[]) {
  // Check museums first (priority over generic tourist attractions)
  if (placeTypes.includes('museum') || placeTypes.includes('art_gallery')) {
    return PLACE_TYPE_DURATION.museum; // 60 minutes
  }
  
  // Check specific types
  for (const type of placeTypes) {
    if (SPECIFIC_TYPE_DURATION[type as keyof typeof SPECIFIC_TYPE_DURATION]) {
      return SPECIFIC_TYPE_DURATION[type as keyof typeof SPECIFIC_TYPE_DURATION];
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
  if (placeTypes.includes('library')) return PLACE_TYPE_DURATION.coworking;
  
  // Default for attractions/viewpoints
  return PLACE_TYPE_DURATION.attraction;
}

// Function to distribute places across multiple days without repeats
function distributeAcrossDays(candidatePlaces: any[], numberOfDays: number, timePerDay: number, startLat: number, startLng: number) {
  console.log(`=== Distributing places across ${numberOfDays} days ===`);
  console.log(`Input: ${candidatePlaces.length} candidates, ${numberOfDays} days, ${timePerDay} minutes per day`);
  
  // Calculate popularity score for all places
  const placesWithScores = candidatePlaces.map((place: any) => {
    const rating = place.rating || 0;
    const reviewCount = place.user_ratings_total || 0;
    
    let popularityScore = 0;
    if (rating > 0) {
      popularityScore += rating * 2;
      if (reviewCount > 0) {
        popularityScore += Math.log(reviewCount + 1) * 0.5;
      }
      if (rating >= 4.5) popularityScore += 2;
      if (rating >= 4.0) popularityScore += 1;
    }
    
    return {
      ...place,
      popularityScore
    };
  });
  
  // Remove duplicates by place_id before sorting
  const uniquePlaces = placesWithScores.filter((place: any, index: number, array: any[]) => {
    if (!place.place_id) {
      console.log(`Skipping place without place_id: ${place.name}`);
      return false;
    }
    return array.findIndex((p: any) => p.place_id === place.place_id) === index;
  });
  
  console.log(`Filtered ${placesWithScores.length} down to ${uniquePlaces.length} unique places`);
  
  // Sort by popularity score (highest first)
  const sortedCandidates = uniquePlaces.sort((a: any, b: any) => {
    return b.popularityScore - a.popularityScore;
  });
  
  console.log('Top candidates by popularity:');
  sortedCandidates.slice(0, 10).forEach((candidate, index) => {
    console.log(`${index + 1}. ${candidate.name} - Score: ${candidate.popularityScore.toFixed(1)} (Rating: ${candidate.rating}, Reviews: ${candidate.user_ratings_total})`);
  });
  
  // Initialize arrays for each day
  const dayPlaces: any[][] = Array.from({ length: numberOfDays }, () => []);
  const usedPlaceIds = new Set<string>();
  
  // Distribute places ensuring no repeats across days
  for (let day = 0; day < numberOfDays; day++) {
    console.log(`\n--- Planning Day ${day + 1} ---`);
    let remainingTime = timePerDay;
    let lastLat = startLat;
    let lastLng = startLng;
    
    // Try to add places to this day from remaining candidates
    for (const candidate of sortedCandidates) {
      // Skip if place doesn't have place_id
      if (!candidate.place_id) {
        console.log(`Skipping place without place_id: ${candidate.name}`);
        continue;
      }
      
      // Skip if place is already used in another day
      if (usedPlaceIds.has(candidate.place_id)) {
        console.log(`Skipping already used place: ${candidate.name} (${candidate.place_id})`);
        continue;
      }
      
      // Calculate time needed for this place
      const estimatedVisitTime = getPlaceVisitDuration(candidate.types || []);
      const walkingTime = calculateWalkingTime(
        lastLat, lastLng,
        candidate.lat || 0,
        candidate.lon || 0
      );
      const totalTimeNeeded = walkingTime + estimatedVisitTime;
      
      console.log(`Candidate: ${candidate.name} - Walk: ${walkingTime}min, Visit: ${estimatedVisitTime}min, Total: ${totalTimeNeeded}min, Remaining: ${remainingTime}min`);
      
      // Check if we have enough time
      if (totalTimeNeeded <= remainingTime) {
        // Add place to this day
        const placeForDay = {
          ...candidate,
          day: day + 1
        };
        dayPlaces[day].push(placeForDay);
        usedPlaceIds.add(candidate.place_id);
        remainingTime -= totalTimeNeeded;
        lastLat = candidate.lat || lastLat;
        lastLng = candidate.lon || lastLng;
        
        console.log(`✓ Added to Day ${day + 1}. Remaining time: ${remainingTime}min`);
        
        // Limit places per day to avoid overcrowding
        if (dayPlaces[day].length >= 8) {
          console.log(`Day ${day + 1} is full (8 places)`);
          break;
        }
      } else {
        console.log(`❌ Not enough time for ${candidate.name} on Day ${day + 1}`);
      }
    }
    
    console.log(`Day ${day + 1} final: ${dayPlaces[day].length} places, ${remainingTime}min remaining`);
  }
  
  // Flatten all days into single array with duplicate check
  const allDayPlaces: any[] = [];
  const finalUsedIds = new Set<string>();
  
  dayPlaces.forEach((places, dayIndex) => {
    console.log(`Day ${dayIndex + 1}: ${places.length} places - ${places.map((p: any) => p.name).join(', ')}`);
    
    places.forEach((place: any) => {
      if (place.place_id && !finalUsedIds.has(place.place_id)) {
        allDayPlaces.push(place);
        finalUsedIds.add(place.place_id);
      } else {
        console.warn(`Duplicate detected in final output: ${place.name} (${place.place_id})`);
      }
    });
  });
  
  console.log(`=== Final Distribution ===`);
  console.log(`Total unique places across all days: ${allDayPlaces.length}`);
  console.log(`Used ${usedPlaceIds.size} unique place IDs`);
  
  return allDayPlaces;
}

// Function to calculate optimal number of stops based on total available time
function calculateOptimalStops(timeMinutes: number, candidatePlaces: any[], startLat: number, startLng: number) {
  if (!candidatePlaces || candidatePlaces.length === 0) return [];
  
  console.log(`=== Time Budget Analysis for ${timeMinutes} minutes ===`);
  
  // Calculate popularity score for each place (rating * log(reviews) + bonus for high ratings)
  const placesWithScores = candidatePlaces.map((place: any) => {
    const rating = place.rating || 0;
    const reviewCount = place.user_ratings_total || 0;
    
    // Popularity formula: rating weight + review count weight + high rating bonus
    let popularityScore = 0;
    if (rating > 0) {
      popularityScore += rating * 2; // Rating counts as 2x multiplier
      if (reviewCount > 0) {
        popularityScore += Math.log(reviewCount + 1) * 0.5; // Logarithmic review count bonus
      }
      if (rating >= 4.5) popularityScore += 2; // Bonus for excellent rating
      if (rating >= 4.0) popularityScore += 1; // Bonus for good rating
    }
    
    return {
      ...place,
      popularityScore
    };
  });
  
  // Sort by popularity score (highest first), then by distance as secondary
  const sortedCandidates = placesWithScores.sort((a: any, b: any) => {
    const scoresDiff = b.popularityScore - a.popularityScore;
    if (Math.abs(scoresDiff) > 0.5) return scoresDiff; // Significant popularity difference
    
    // If popularity is similar, prefer closer places
    const distA = calculateDistance(startLat, startLng, a.lat, a.lon);
    const distB = calculateDistance(startLat, startLng, b.lat, b.lon);
    return distA - distB;
  });
  
  console.log('Top candidates by popularity:');
  sortedCandidates.slice(0, 5).forEach((place: any, i: number) => {
    console.log(`${i+1}. ${place.name} - Score: ${place.popularityScore.toFixed(1)} (Rating: ${place.rating}, Reviews: ${place.user_ratings_total})`);
  });
  
  const selectedStops: any[] = [];
  let remainingTime = timeMinutes;
  let totalWalkingTime = 0;
  let totalVisitTime = 0;
  
  // Always include walking time from start to first location
  if (sortedCandidates.length > 0) {
    const firstStop = sortedCandidates[0];
    
    // Validate first stop has coordinates
    if (typeof firstStop.lat !== 'number' || typeof firstStop.lon !== 'number') {
      console.error('First stop missing coordinates:', { 
        name: firstStop.name, 
        lat: firstStop.lat, 
        lon: firstStop.lon 
      });
      return selectedStops;
    }
    
    const walkingTimeToFirst = estimateWalkingTime(
      calculateDistance(startLat, startLng, firstStop.lat, firstStop.lon)
    );
    const visitDuration = getPlaceVisitDuration(firstStop.types || []);
    
    console.log(`First stop: ${firstStop.name} - Walk: ${walkingTimeToFirst}min, Visit: ${visitDuration}min, Total: ${walkingTimeToFirst + visitDuration}min, Popularity: ${firstStop.popularityScore.toFixed(1)}`);
    
    if (walkingTimeToFirst + visitDuration <= remainingTime) {
      selectedStops.push(firstStop);
      remainingTime -= (walkingTimeToFirst + visitDuration);
      totalWalkingTime += walkingTimeToFirst;
      totalVisitTime += visitDuration;
      console.log(`✓ Added first stop. Remaining time: ${remainingTime}min`);
    } else {
      console.log(`✗ First stop doesn't fit in time budget`);
    }
  }
  
  // Add additional stops while time permits
  for (let i = 1; i < sortedCandidates.length && selectedStops.length < 8; i++) {
    const candidate = sortedCandidates[i];
    
    // Skip if no stops have been selected yet (lastStop would be undefined)
    if (selectedStops.length === 0) continue;
    
    const lastStop = selectedStops[selectedStops.length - 1];
    
    // Calculate walking time from last stop to this candidate
    const walkingTime = estimateWalkingTime(
      calculateDistance(lastStop.lat, lastStop.lon, candidate.lat, candidate.lon)
    );
    const visitDuration = getPlaceVisitDuration(candidate.types || []);
    
    // Check if we have enough time for walking + visit + buffer
    const totalTimeNeeded = walkingTime + visitDuration + 5; // 5 min buffer
    
    console.log(`Candidate: ${candidate.name} - Walk: ${walkingTime}min, Visit: ${visitDuration}min, Total needed: ${totalTimeNeeded}min, Remaining: ${remainingTime}min, Popularity: ${candidate.popularityScore.toFixed(1)}`);
    
    if (totalTimeNeeded <= remainingTime) {
      selectedStops.push(candidate);
      remainingTime -= totalTimeNeeded;
      totalWalkingTime += walkingTime;
      totalVisitTime += visitDuration;
      console.log(`✓ Added stop ${selectedStops.length}. Remaining time: ${remainingTime}min`);
    } else {
      console.log(`✗ Stop doesn't fit in remaining time budget`);
    }
  }
  
  console.log(`=== Final Route Summary ===`);
  console.log(`Total stops: ${selectedStops.length}`);
  console.log(`Total walking time: ${totalWalkingTime}min`);
  console.log(`Total visit time: ${totalVisitTime}min`);
  console.log(`Total used time: ${totalWalkingTime + totalVisitTime}min`);
  console.log(`Time remaining: ${remainingTime}min`);
  console.log(`Original budget: ${timeMinutes}min`);
  
  return selectedStops;
}

// Haversine distance formula for walking time
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distance in meters
}

// Calculate walking time based on distance
function calculateWalkingTime(lat1: number, lon1: number, lat2: number, lon2: number) {
  const distanceMeters = calculateDistance(lat1, lon1, lat2, lon2);
  // Average walking speed: 5 km/h = 83.33 m/min
  const walkingTimeMinutes = Math.ceil(distanceMeters / 83.33);
  return Math.max(walkingTimeMinutes, 5); // Minimum 5 minutes walking time
}

function estimateWalkingTime(distance: number) {
  const walkingSpeed = 80; // Meters per minute (4.8 km/h average)
  return Math.round(distance / walkingSpeed);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, origin, destination, destinationType, goals, timeWindow, scenario, maxPlaces } = await req.json();
    
    console.log('=== TRIPADVISOR API REQUEST ===');
    console.log('Raw request body:', JSON.stringify({ location, origin, destination, destinationType, goals, timeWindow, scenario, maxPlaces }));
    console.log('Location:', location);
    console.log('Origin:', origin);
    console.log('Destination:', destination);
    console.log('Destination Type:', destinationType);
    console.log('Goals:', goals);
    console.log('Time Window (input):', timeWindow);
    console.log('Scenario:', scenario, 'Type:', typeof scenario);
    console.log('Max Places:', maxPlaces);
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

    // Extract coordinates from origin (the actual starting point)
    const originLocation = origin || location;
    let lat, lng;
    if (typeof originLocation === 'object' && originLocation.lat && originLocation.lon) {
      lat = originLocation.lat;
      lng = originLocation.lon;
      console.log('Using provided origin coordinates:', { lat, lng });
    } else {
      // Geocode string origin location
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(originLocation)}&key=${googleApiKey}`;
      console.log('Geocoding origin URL:', geocodeUrl);
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      console.log('Geocode response:', JSON.stringify(geocodeData, null, 2));
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        console.error('Geocoding failed:', geocodeData);
        throw new Error(`Could not geocode origin location: ${originLocation}. Status: ${geocodeData.status}`);
      }
      
      lat = geocodeData.results[0].geometry.location.lat;
      lng = geocodeData.results[0].geometry.location.lng;
      console.log(`Geocoded origin ${originLocation} to:`, { lat, lng });
      
      // Validate that we got valid coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates from geocoding:', { lat, lng });
        throw new Error(`Failed to get valid coordinates for origin location: ${originLocation}`);
      }
    }

    // Additional validation for coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates after processing:', { lat, lng, location });
      throw new Error(`Invalid coordinates for location: ${location}`);
    }

    console.log('Final coordinates validation passed:', { lat, lng });
    const goalToTypesMap = {
      'Parks': ['park'],
      'Restaurants': ['restaurant'],
      'Museums': ['museum', 'art_gallery'],
      'Sightseeing': ['tourist_attraction', 'point_of_interest'],
      'Culture': ['tourist_attraction', 'point_of_interest'],
      'Architectural landmarks': ['tourist_attraction', 'point_of_interest'],
      'Cafés': ['cafe'],
      'Bars': ['bar', 'night_club'],
      'Nightlife': ['bar', 'night_club'],
      'Coworking': ['library'],
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
      timeMinutes = (timeMap as any)[timeWindow] || 60;
    } else {
      timeMinutes = 60; // Default to 1 hour
    }

    console.log(`Time available: ${timeMinutes} minutes`);

    // Calculate number of days for multi-day planning
    let numberOfDays = 1;
    let timePerDay = timeMinutes;
    
    if (scenario === 'planning') {
      // For planning scenario, timeWindow comes as total minutes for all days
      // Calculate actual number of days based on total time
      if (timeMinutes >= 480) {
        numberOfDays = Math.ceil(timeMinutes / 480); // 480 minutes = 8 hours per day
        timePerDay = 480; // Fixed 8 hours per day
      }
    }
    
    console.log(`Planning mode: scenario=${scenario}, totalTime=${timeMinutes}, numberOfDays=${numberOfDays}, timePerDay=${timePerDay} minutes`);

    // Use a larger search radius (10km+) to find more popular/famous places
    const radius = Math.min(15000, Math.max(10000, timeMinutes * 15)); // 10-15km range
    
    console.log(`Search parameters: radius=${radius}m (${(radius/1000).toFixed(1)}km), timeAvailable=${timeMinutes}min`);
    console.log('=== USER GOALS ===');
    console.log('Goals received from client:', goals);

    // Get unique types for search
    const allTypes = goals.flatMap((goal: any) => goalToTypesMap[goal as keyof typeof goalToTypesMap] || ['point_of_interest']);
    const uniqueTypes = [...new Set(allTypes)];
    console.log('Mapped types for search:', uniqueTypes);

    // Helper function to normalize Google Places types
    const normalizeType = (googleTypes: any[]) => {
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
        // Get place details with more comprehensive information
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=url,website,opening_hours,rating,user_ratings_total,photos,editorial_summary,price_level,formatted_phone_number&key=${googleApiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        const details = detailsData.result || {};
        
        // Build photo URL if available
        let photoUrl = null;
        if (details.photos && details.photos.length > 0) {
          const photoRef = details.photos[0].photo_reference;
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${googleApiKey}`;
        }
        
        // Skip hotels, lodging, shopping centers, and cinemas completely
        const placeTypes = place.types || [];
        const nameLower = place.name.toLowerCase();
        
        if (placeTypes.includes('lodging') || placeTypes.includes('hotel') || 
            placeTypes.includes('shopping_mall') || placeTypes.includes('shopping_center') ||
            placeTypes.includes('movie_theater') || placeTypes.includes('stadium') ||
            nameLower.includes('hotel') || nameLower.includes('hostel') ||
            nameLower.includes('inn') || nameLower.includes('resort') ||
            nameLower.includes('motel') || nameLower.includes('mall') ||
            nameLower.includes('cinema') || nameLower.includes('kino')) {
          console.log(`Skipping unwanted type: ${place.name} - types [${placeTypes.join(', ')}]`);
          continue;
        }
        
        // Validate place matches user's goals before including
        const normalizedType = normalizeType(placeTypes);
        
        // Check if this place actually matches the user's selected goals with strict filtering
        const matchesGoals = goals.some((goal: any) => {
          const expectedTypes = goalToTypesMap[goal as keyof typeof goalToTypesMap] || [];
          
          console.log(`Checking ${place.name} against goal "${goal}" - types: [${placeTypes.join(', ')}]`);
          
          // Strict matching for specific categories
          if (goal === 'Bars') {
            const matches = placeTypes.includes('bar') || placeTypes.includes('night_club');
            console.log(`  Bars check: ${matches}`);
            return matches;
          }
          if (goal === 'Cafés') {
            const matches = placeTypes.includes('cafe') && !placeTypes.includes('restaurant');
            console.log(`  Cafés check: ${matches}`);
            return matches;
          }
          if (goal === 'Restaurants') {
            const matches = placeTypes.includes('restaurant') && !placeTypes.includes('cafe');
            console.log(`  Restaurants check: ${matches}`);
            return matches;
          }
          if (goal === 'Museums') {
            const matches = placeTypes.includes('museum') || placeTypes.includes('art_gallery');
            console.log(`  Museums check: ${matches}`);
            return matches;
          }
          if (goal === 'Parks') {
            const matches = placeTypes.includes('park');
            console.log(`  Parks check: ${matches}`);
            return matches;
          }
          if (goal === 'Bakery') {
            const matches = placeTypes.includes('bakery');
            console.log(`  Bakery check: ${matches}`);
            return matches;
          }
          if (goal === 'Coworking') {
            const matches = placeTypes.includes('library') && !placeTypes.includes('museum');
            console.log(`  Coworking check: ${matches}`);
            return matches;
          }
          
          // For Viewpoints and Architectural landmarks, be EXTREMELY specific
          if (goal === 'Viewpoints') {
            // Must be tourist_attraction
            // MUST NOT have: museum, restaurant, cafe, bar, shopping, cinema types
            const hasRequiredType = placeTypes.includes('tourist_attraction');
            const hasDisqualifyingType = placeTypes.some((t: string) => 
              ['shopping_mall', 'movie_theater', 'museum', 'restaurant', 'cafe', 'bar', 'night_club', 'lodging', 'art_gallery'].includes(t)
            );
            const matches = hasRequiredType && !hasDisqualifyingType;
            console.log(`  Viewpoints check: hasRequired=${hasRequiredType}, hasDisqualifying=${hasDisqualifyingType}, matches=${matches}`);
            return matches;
          }
          if (goal === 'Architectural landmarks') {
            // ONLY actual architectural monuments, castles, historic buildings
            // MUST NOT have: museum, restaurant, cafe, bar, shopping, cinema types
            const hasRequiredType = placeTypes.includes('tourist_attraction') || placeTypes.includes('point_of_interest');
            const hasDisqualifyingType = placeTypes.some((t: string) => 
              ['shopping_mall', 'movie_theater', 'museum', 'restaurant', 'cafe', 'bar', 'night_club', 'lodging', 'art_gallery'].includes(t)
            );
            const matches = hasRequiredType && !hasDisqualifyingType;
            console.log(`  Architectural landmarks check: hasRequired=${hasRequiredType}, hasDisqualifying=${hasDisqualifyingType}, matches=${matches}`);
            return matches;
          }
          
          // Default to checking expected types
          const matches = expectedTypes.some(expectedType => placeTypes.includes(expectedType));
          console.log(`  Default check against expected types [${expectedTypes.join(', ')}]: ${matches}`);
          return matches;
        });
        
        // Skip places that don't match user's goals
        if (!matchesGoals) {
          console.log(`❌ SKIPPING ${place.name} - doesn't match goals [${goals.join(', ')}]`);
          continue;
        } else {
          console.log(`✅ KEEPING ${place.name} - matches goals`);
        }
        
        // Generate description with interesting facts
        const description = generatePlaceDescription(place, details, normalizedType);
        console.log(`Description generated for ${place.name}:`, description);
        
        // Format opening hours
        const openingHours = details.opening_hours?.weekday_text || [];
        
        // Generate ticket price info
        const ticketPrice = generateTicketPriceInfo(details, normalizedType);
        
        const enrichedPlace = {
          place_id: place.place_id, // Add the missing place_id field
          name: place.name,
          address: place.vicinity || place.formatted_address || 'Address not available',
          lat: place.geometry?.location?.lat,
          lon: place.geometry?.location?.lng,
          types: place.types || [],
          typeNormalized: normalizedType,
          webUrl: details.url || details.website,
          website: details.website,
          photoUrl: photoUrl,
          rating: details.rating || place.rating,
          user_ratings_total: details.user_ratings_total || place.user_ratings_total,
          description: description,
          openingHours: openingHours,
          ticketPrice: ticketPrice
        };
        
        // Validate coordinates before adding
        if (typeof enrichedPlace.lat === 'number' && typeof enrichedPlace.lon === 'number') {
          enrichedCandidates.push(enrichedPlace);
        } else {
          console.error(`Skipping place with invalid coordinates: ${place.name}`, {
            lat: enrichedPlace.lat,
            lon: enrichedPlace.lon,
            geometry: place.geometry
          });
        }
        
      } catch (error) {
        console.error(`Error enriching place ${place.name}:`, error);
      }
    }

    console.log(`Enriched ${enrichedCandidates.length} candidates`);
    
    // DEBUG: Check candidates for duplicates before distribution
    console.log('=== CHECKING CANDIDATES FOR DUPLICATES ===');
    const candidateIds = enrichedCandidates.map((c: any) => c.place_id);
    const uniqueIds = new Set(candidateIds);
    console.log(`Total candidates: ${enrichedCandidates.length}, Unique place_ids: ${uniqueIds.size}`);
    if (candidateIds.length !== uniqueIds.size) {
      console.warn('DUPLICATE PLACE_IDS DETECTED IN INPUT!');
      const duplicates = candidateIds.filter((id, index) => candidateIds.indexOf(id) !== index);
      console.log('Duplicate place_ids:', duplicates);
    }
    enrichedCandidates.forEach((candidate: any, index: number) => {
      console.log(`${index + 1}. ${candidate.name} (${candidate.place_id})`);
    });

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
    console.log('Coordinates before calculateOptimalStops:', { lat, lng });
    console.log('Sample candidate coordinates:', enrichedCandidates.slice(0, 2).map(c => ({ name: c.name, lat: c.lat, lon: c.lon })));
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.error('Invalid start coordinates:', { lat, lng, location });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid start coordinates for location: ${location}. Got lat: ${lat}, lng: ${lng}`,
          places: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`Debug: scenario=${JSON.stringify(scenario)}, numberOfDays=${numberOfDays}, timePerDay=${timePerDay}`);
    console.log(`Debug: scenario type=${typeof scenario}, comparison result=${scenario === 'planning'}, numberOfDays > 1=${numberOfDays > 1}`);
    
    let optimalStops;
    if (String(scenario) === 'planning' && numberOfDays > 1) {
      // For multi-day planning, distribute places across days without repeats
      console.log('✅ Using multi-day distribution logic');
      optimalStops = distributeAcrossDays(enrichedCandidates, numberOfDays, timePerDay, lat, lng);
    } else {
      console.log(`❌ Using single-day logic. Scenario: ${scenario}, NumberOfDays: ${numberOfDays}`);
      optimalStops = calculateOptimalStops(timeMinutes, enrichedCandidates, lat, lng);
    }
    
    console.log(`Selected ${optimalStops.length} optimal stops`);

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
      visitDuration: getPlaceVisitDuration(place.types || []),
      description: place.description,
      openingHours: place.openingHours,
      ticketPrice: place.ticketPrice,
      website: place.website,
      day: place.day // Add day property for multi-day planning
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
          (finalStops[0] as any).walkingTimeFromPrevious = estimateWalkingTime(distToFirst);
          totalWalkingTime += (finalStops[0] as any).walkingTimeFromPrevious;

          // Calculate walking times between consecutive stops
          for (let i = 1; i < finalStops.length; i++) {
            const dist = calculateDistance(
              finalStops[i-1].lat, 
              finalStops[i-1].lon, 
              finalStops[i].lat, 
              finalStops[i].lon
            );
            (finalStops[i] as any).walkingTimeFromPrevious = estimateWalkingTime(dist);
            totalWalkingTime += (finalStops[i] as any).walkingTimeFromPrevious;
          }
        } else {
          // Single stop - just calculate time from start
          const distToFirst = calculateDistance(lat, lng, finalStops[0].lat, finalStops[0].lon);
          (finalStops[0] as any).walkingTimeFromPrevious = estimateWalkingTime(distToFirst);
          totalWalkingTime += (finalStops[0] as any).walkingTimeFromPrevious;
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
          totalVisitTime: finalStops.reduce((sum: number, stop: any) => sum + (stop.visitDuration || 0), 0),
          location: (lat !== undefined && lng !== undefined) ? { lat, lng } : null,
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});