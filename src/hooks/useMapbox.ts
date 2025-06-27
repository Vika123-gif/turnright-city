
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
      console.log(`Geocoding "${placeName}" in ${location}`);
      
      const { data, error } = await supabase.functions.invoke('mapbox-geocoding', {
        body: { placeName, location }
      });

      if (error) {
        console.error('Mapbox geocoding error:', error);
        return {
          found: false,
          placeName,
          address: `${placeName}, ${location}, Portugal`
        };
      }

      console.log('Mapbox geocoding result:', data);
      return data;
      
    } catch (error) {
      console.error('Error calling mapbox geocoding:', error);
      return {
        found: false,
        placeName,
        address: `${placeName}, ${location}, Portugal`
      };
    }
  }

  return { geocodePlace };
}
