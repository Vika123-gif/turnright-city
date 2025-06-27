import { useState } from "react";

export type OSMPlace = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  type?: string;
  category?: string;
};

export function useOpenStreetMap() {
  const [loading, setLoading] = useState(false);

  async function searchPlaces(
    query: string,
    location: string,
    limit: number = 10
  ): Promise<OSMPlace[]> {
    setLoading(true);
    console.log("=== DEBUG: OpenStreetMap search ===");
    console.log("Query:", query);
    console.log("Location:", location);
    
    try {
      // Try multiple search strategies for better results
      const searchStrategies = [
        // Strategy 1: Exact business name search
        `${query} ${location}`,
        // Strategy 2: Business type + location search
        `restaurant ${location}`,
        // Strategy 3: Just location-based search
        location
      ];

      let bestResults: OSMPlace[] = [];
      
      for (const searchQuery of searchStrategies) {
        console.log("Trying search strategy:", searchQuery);
        
        const results = await performOSMSearch(searchQuery, location, limit);
        
        if (results.length > 0) {
          // Check if we found a good match
          const exactMatch = results.find(r => 
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            query.toLowerCase().includes(r.name.toLowerCase())
          );
          
          if (exactMatch) {
            console.log("Found exact match:", exactMatch);
            bestResults = [exactMatch];
            break;
          } else if (bestResults.length === 0) {
            // Keep first set of results as fallback
            bestResults = results;
          }
        }
      }

      return bestResults;

    } catch (error) {
      console.error("OpenStreetMap search error:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function performOSMSearch(
    query: string,
    location: string,
    limit: number
  ): Promise<OSMPlace[]> {
    // Determine if location is coordinates or city name
    let searchArea = "";
    if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location)) {
      // If coordinates, use them for bounded search
      const [lat, lon] = location.split(',').map(coord => parseFloat(coord.trim()));
      searchArea = `viewbox=${lon-0.05},${lat+0.05},${lon+0.05},${lat-0.05}&bounded=1`;
    }

    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=${limit}&` +
      `countrycodes=pt&` + // Limit to Portugal
      (searchArea ? searchArea + '&' : '') +
      `accept-language=en`;

    console.log("OSM API URL:", url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TurnRightCity/1.0 (contact@turnright.city)'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenStreetMap API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("OSM API Response:", data);

    const places: OSMPlace[] = data
      .filter((item: any) => {
        // Broader filter to include more types of places
        return item.class === 'amenity' || 
               item.class === 'shop' || 
               item.class === 'tourism' ||
               item.class === 'leisure' ||
               item.class === 'place' ||
               (item.type && ['restaurant', 'cafe', 'bar', 'pub', 'museum', 'gallery', 'park', 'attraction'].includes(item.type));
      })
      .map((item: any) => ({
        name: item.display_name.split(',')[0] || item.name || "Unknown Place",
        address: formatAddressForMaps(item),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
        category: item.class
      }))
      .slice(0, limit);

    console.log("Processed OSM places:", places);
    return places;
  }

  // Format address in a way that's optimized for map applications
  function formatAddressForMaps(item: any): string {
    const addressParts = [];
    
    // Get the main business/place name
    const placeName = item.display_name.split(',')[0] || item.name;
    if (placeName && placeName !== "Unknown Place") {
      addressParts.push(placeName);
    }
    
    // Build a clean address from OSM address components
    if (item.address) {
      const addr = item.address;
      
      // Add street information
      if (addr.house_number && addr.road) {
        addressParts.push(`${addr.road} ${addr.house_number}`);
      } else if (addr.road) {
        addressParts.push(addr.road);
      }
      
      // Add postal code and city for better accuracy
      if (addr.postcode && addr.city) {
        addressParts.push(`${addr.postcode} ${addr.city}`);
      } else if (addr.city) {
        addressParts.push(addr.city);
      } else if (addr.town) {
        addressParts.push(addr.town);
      } else if (addr.village) {
        addressParts.push(addr.village);
      }
      
      // Always add country for international compatibility
      if (addr.country) {
        addressParts.push(addr.country);
      } else {
        addressParts.push("Portugal");
      }
    } else {
      // Fallback: use display_name but clean it up
      const displayParts = item.display_name.split(',').map((part: string) => part.trim());
      
      // Take first few relevant parts
      if (displayParts.length > 1) {
        addressParts.push(...displayParts.slice(1, 4));
      }
      
      // Ensure Portugal is included
      if (!addressParts.some(part => part.toLowerCase().includes('portugal'))) {
        addressParts.push("Portugal");
      }
    }
    
    // Join with commas and clean up
    return addressParts
      .filter(part => part && part.trim().length > 0)
      .join(', ')
      .replace(/,\s*,/g, ',') // Remove double commas
      .trim();
  }

  async function calculateWalkingTime(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
  ): Promise<number> {
    try {
      // Use OSRM (Open Source Routing Machine) for walking directions
      const url = `https://router.project-osrm.org/route/v1/foot/${fromLon},${fromLat};${toLon},${toLat}?overview=false&steps=false`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("OSRM API error");
      }

      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const durationSeconds = data.routes[0].duration;
        return Math.ceil(durationSeconds / 60); // Convert to minutes and round up
      }
      
      // Fallback to straight-line distance calculation
      return calculateStraightLineWalkingTime(fromLat, fromLon, toLat, toLon);
    } catch (error) {
      console.warn("OSRM routing failed, using straight-line estimation:", error);
      return calculateStraightLineWalkingTime(fromLat, fromLon, toLat, toLon);
    }
  }

  function calculateStraightLineWalkingTime(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
  ): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (toLat - fromLat) * (Math.PI / 180);
    const dLon = (toLon - fromLon) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(fromLat * (Math.PI / 180)) * Math.cos(toLat * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    // Average walking speed: 5 km/h, add 20% buffer for city walking
    const walkingTimeMinutes = (distance / 5) * 60 * 1.2;
    return Math.max(3, Math.ceil(walkingTimeMinutes)); // Minimum 3 minutes
  }

  return {
    searchPlaces,
    calculateWalkingTime,
    loading
  };
}
