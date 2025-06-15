
import { useState } from "react";

type Place = {
  name: string;
  address: string;
  walkingTime: number; // walking time in minutes
  type?: string;
};

export function useGooglePlaces() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      return data.places as Place[];
    } catch (err: any) {
      setError(err.message || "Unknown backend error.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  return { getNearbyPlaces, loading, error };
}
