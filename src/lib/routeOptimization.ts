import type { LLMPlace } from '@/hooks/useOpenAI';

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Extract coordinates from a place or origin string
 */
function extractCoordinates(place: LLMPlace | string): { lat: number; lon: number } | null {
  if (typeof place === 'string') {
    // Check if it's a coordinate string "lat,lon"
    const coordMatch = place.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      return { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) };
    }
    return null;
  }
  
  // It's a LLMPlace object
  if (place.lat && place.lon) {
    return { lat: place.lat, lon: place.lon };
  }
  if (place.coordinates) {
    return { lat: place.coordinates[1], lon: place.coordinates[0] };
  }
  return null;
}

/**
 * Optimize route order using nearest-neighbor algorithm
 * Returns places in optimal visiting order starting from origin
 */
export function optimizeRouteOrder(
  places: LLMPlace[],
  origin?: string
): LLMPlace[] {
  console.log('=== ROUTE OPTIMIZATION START ===');
  console.log('Input places:', places.length);
  console.log('Origin:', origin);
  
  // Filter places that have valid coordinates
  const validPlaces = places.filter(place => {
    const coords = extractCoordinates(place);
    return coords !== null;
  });
  
  console.log('Valid places with coordinates:', validPlaces.length);
  
  if (validPlaces.length === 0) {
    console.log('No valid places to optimize, returning original order');
    return places;
  }
  
  // Get origin coordinates
  let currentCoords: { lat: number; lon: number } | null = null;
  if (origin) {
    currentCoords = extractCoordinates(origin);
  }
  
  // If no origin, use first place as starting point
  if (!currentCoords) {
    currentCoords = extractCoordinates(validPlaces[0]);
    console.log('No origin provided, using first place as start:', currentCoords);
  } else {
    console.log('Starting from origin:', currentCoords);
  }
  
  if (!currentCoords) {
    console.log('Cannot determine starting point, returning original order');
    return places;
  }
  
  const unvisited = [...validPlaces];
  const optimized: LLMPlace[] = [];
  
  // Nearest-neighbor algorithm with walking time recalculation
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let shortestDistance = Infinity;
    
    // Find nearest unvisited place
    unvisited.forEach((place, index) => {
      const placeCoords = extractCoordinates(place);
      if (placeCoords) {
        const distance = calculateDistance(
          currentCoords!.lat,
          currentCoords!.lon,
          placeCoords.lat,
          placeCoords.lon
        );
        
        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestIndex = index;
        }
      }
    });
    
    // Move to nearest place
    const nearestPlace = unvisited[nearestIndex];
    
    // Recalculate walking time based on actual distance in the new order
    // Average walking speed: 5 km/h = ~12 min/km
    const walkingTimeMinutes = Math.ceil(shortestDistance * 12);
    
    // Update the place with correct walking time for the new route order
    const updatedPlace = {
      ...nearestPlace,
      walkingTime: walkingTimeMinutes
    };
    
    optimized.push(updatedPlace);
    
    const nearestCoords = extractCoordinates(nearestPlace);
    console.log(`Selected: ${nearestPlace.name} (${shortestDistance.toFixed(2)}km, ~${walkingTimeMinutes}min walk from current)`);
    
    if (nearestCoords) {
      currentCoords = nearestCoords;
    }
    
    unvisited.splice(nearestIndex, 1);
  }
  
  console.log('=== ROUTE OPTIMIZATION COMPLETE ===');
  console.log('Optimized order:', optimized.map(p => p.name));
  
  return optimized;
}
