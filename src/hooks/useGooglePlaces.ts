
import { useState } from "react";

type Place = {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type WalkingInfo = {
  place: Place;
  walkMinutes: number;
  walkDistance: string;
};

// NOTE: Frontend now calls our backend edge function (API) instead of Google APIs directly
export function useGooglePlaces() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find places that match the user's goals
  async function findPlaces(opts: {
    location: string;
    query: string;
    radiusMeters?: number;
    maxResults?: number;
  }): Promise<Place[]> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/functions/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "findPlaces",
          location: opts.location,
          query: opts.query,
          radiusMeters: opts.radiusMeters ?? 1200,
          maxResults: opts.maxResults ?? 5,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch places from backend.");
      const data = await response.json();
      return data.results as Place[];
    } catch (err: any) {
      setError(err.message || "Unknown backend error.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  // Calculate real walking time between two coordinates
  async function getWalkingTimeMinutes(
    from: string,
    toLat: number,
    toLng: number
  ): Promise<{ minutes: number; distanceText: string }> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/functions/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getWalkingTime",
          from,
          toLat,
          toLng,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch walking time from backend.");
      const data = await response.json();
      return {
        minutes: data.minutes,
        distanceText: data.distanceText,
      };
    } catch (err: any) {
      setError(err.message || "Unknown backend error");
      return { minutes: 99, distanceText: "unknown" };
    } finally {
      setLoading(false);
    }
  }

  return { findPlaces, getWalkingTimeMinutes, loading, error };
}
