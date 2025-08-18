
import { useState } from "react";

type Place = {
  name: string;
  address: string;
  walkingTime: number; // walking time in minutes
  type?: string;
  photoUrl?: string; // Google Places photo URL
};

export type GooglePlacesDebug = {
  location: string;
  searchRadius: number;
  goals: string[];
  initialFound: number;
  afterWalkingFilter: number;
  walkingLimit: number;
  filteredTypes: string[];
};

export function useGooglePlaces() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<GooglePlacesDebug | null>(null);

  /**
   * Calls the Supabase Edge Function with user's location, goals and timeWindow.
   * @param opts 
   * @returns Place[] (real places with walking times)
   */
  async function getNearbyPlaces(opts: {
    location: string;
    goals: string[];
    timeWindow: string;
  }): Promise<Place[]> {
    setLoading(true);
    setError(null);

    // These are what you wanted to know for debugging
    const searchRadius = 800;
    const walkingLimit = 10; // minutes

    try {
      const response = await fetch("https://gwwqfoplhhtyjkrhazbt.supabase.co/functions/v1/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: opts.location,
          goals: opts.goals,
          timeWindow: opts.timeWindow,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch places from backend.");
      const data = await response.json();

      if (!data.success || !Array.isArray(data.places)) {
        throw new Error("Invalid response from backend.");
      }

      // Assume all returned are within 800m, but double-check the walkingTime
      const initialFound = data.places.length;
      const afterWalking = data.places.filter(
        (p: any) => typeof p.walkingTime === "number" && p.walkingTime <= walkingLimit
      );
      setDebugInfo({
        location: opts.location,
        searchRadius,
        goals: opts.goals,
        initialFound,
        afterWalkingFilter: afterWalking.length,
        walkingLimit,
        filteredTypes: Array.from(new Set(data.places.map((p: any) => p.type || "unknown")))
      });

      return afterWalking as Place[];
    } catch (err: any) {
      setError(err.message || "Unknown backend error.");
      setDebugInfo(null);
      return [];
    } finally {
      setLoading(false);
    }
  }

  /**
   * Search for a specific place by name near a location
   * @param opts 
   * @returns Place[] (matching places)
   */
  async function searchPlacesByName(opts: {
    placeName: string;
    location: string;
    placeType?: string;
  }): Promise<Place[]> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://gwwqfoplhhtyjkrhazbt.supabase.co/functions/v1/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: opts.location,
          placeName: opts.placeName,
          placeType: opts.placeType,
          searchMode: "by_name"
        }),
      });

      if (!response.ok) throw new Error("Failed to search places by name.");
      const data = await response.json();

      if (!data.success || !Array.isArray(data.places)) {
        throw new Error("Invalid response from place search.");
      }

      return data.places as Place[];
    } catch (err: any) {
      setError(err.message || "Unknown place search error.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  return { getNearbyPlaces, searchPlacesByName, loading, error, debugInfo };
}
