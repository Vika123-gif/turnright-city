
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

export function useGooglePlaces(apiKey: string) {
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
      const [lat, lng] = opts.location.split(",").map(Number);
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          opts.query
        )}&location=${lat},${lng}&radius=${opts.radiusMeters ?? 1200}&key=${apiKey}`
      );
      const data = await resp.json();
      if (data.status !== "OK") throw new Error(data.error_message || "Google Places API error.");
      return (data.results.slice(0, opts.maxResults || 5) || []).map((item: any) => ({
        place_id: item.place_id,
        name: item.name,
        address: item.formatted_address,
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
      }));
    } catch (err: any) {
      setError(err.message || "Unknown Google Places error.");
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
      const [fromLat, fromLng] = from.split(",").map(Number);
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&mode=walking&key=${apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== "OK") throw new Error(data.error_message || "Google Directions API error.");
      const route = data.routes[0];
      if (!route) throw new Error("No walking route found");
      const leg = route.legs[0];
      return {
        minutes: Math.round((leg.duration.value || 0) / 60),
        distanceText: leg.distance.text,
      };
    } catch (err: any) {
      setError(err.message || "Unknown Google Directions error");
      return { minutes: 99, distanceText: "unknown" };
    } finally {
      setLoading(false);
    }
  }

  return { findPlaces, getWalkingTimeMinutes, loading, error };
}
