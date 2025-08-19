import { useState } from "react";

export type RoutePlace = {
  name: string;
  address: string;
  walkingTime: number;
  type?: string;
  reason?: string;
  rating?: number;
  coordinates?: [number, number]; // [lng, lat]
  photoUrl?: string;
  tripAdvisorInfo?: {
    description?: string;
    web_url?: string;
    ranking?: string;
    num_reviews?: number;
    awards?: any[];
  };
};

export function useRouteGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateRoute(opts: {
    location: string;
    goals: string[];
    timeWindow: number;
  }): Promise<RoutePlace[]> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://gwwqfoplhhtyjkrhazbt.supabase.co/functions/v1/route-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: opts.location,
          goals: opts.goals,
          timeWindow: opts.timeWindow.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate route from backend.");
      }
      
      const data = await response.json();

      if (!data.success || !Array.isArray(data.places)) {
        throw new Error("Invalid response from route generator.");
      }

      return data.places as RoutePlace[];
    } catch (err: any) {
      setError(err.message || "Unknown route generation error.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  return { generateRoute, loading, error };
}