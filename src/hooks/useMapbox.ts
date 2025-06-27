
import { supabase } from "@/integrations/supabase/client";

export type MapboxResult = {
  found: boolean;
  placeName: string;
  address: string;
  coordinates?: [number, number]; // [lng, lat]
  category?: string;
  confidence?: number;
};

export function useMapbox() {
  async function geocodePlace(placeName: string, location: string): Promise<MapboxResult> {
    try {
      console.log(`Geocoding disabled - using fallback for "${placeName}" in ${location}`);
      
      // Return simple fallback address without API call
      return {
        found: false,
        placeName,
        address: `${placeName}, ${location}, Portugal`
      };
      
    } catch (error) {
      console.error('Error in mapbox fallback:', error);
      return {
        found: false,
        placeName,
        address: `${placeName}, ${location}, Portugal`
      };
    }
  }

  return { geocodePlace };
}
