
import { useState } from "react";
import { useGooglePlaces } from "./useGooglePlaces";

// Helper: get queries for places based on goals
function goalToQueries(goals: string[]): string[] {
  const keywords = [];
  for (const g of goals) {
    const s = g.toLowerCase();
    if (s.includes("coffee")) keywords.push("coffee shop");
    if (s.includes("eat")) keywords.push("restaurant");
    if (s.includes("work")) keywords.push("workspace,coworking,cafe for work");
    if (s.includes("explore")) keywords.push("tourist attraction,museum,park,interesting places");
  }
  // Default fallback
  if (keywords.length === 0) keywords.push("places of interest");
  return keywords;
}

export const useOpenAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google API key is stored in localStorage
  const googleApiKey = localStorage.getItem("google_api_key") || "";

  // Real recommendation + true walking times
  async function generateRoute(options: {
    location: string;
    time_window: string;
    goals: string[];
    apiKey: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      // Use Google Places API to get real places
      if (!googleApiKey) throw new Error("No Google API key set, please provide it in settings.");

      const { findPlaces, getWalkingTimeMinutes } = useGooglePlaces(googleApiKey);

      // Find all candidate places for all goals (flattened result, no dups by place_id)
      let allCandidates: any[] = [];
      const queries = goalToQueries(options.goals);
      for (const query of queries) {
        const places = await findPlaces({
          location: options.location,
          query,
          radiusMeters: 1200,
          maxResults: 5,
        });
        for (const p of places) {
          if (!allCandidates.some(x => x.place_id === p.place_id)) allCandidates.push(p);
        }
      }

      // For each candidate, get real walking time
      let candidatesWithTimes = [];
      for (const place of allCandidates) {
        const times = await getWalkingTimeMinutes(options.location, place.lat, place.lng);
        candidatesWithTimes.push({
          ...place,
          walkMinutes: times.minutes,
          walkDistance: times.distanceText,
        });
      }

      // Only show places <= 10 min walk
      const filtered = candidatesWithTimes.filter((c) => c.walkMinutes <= 10);

      if (filtered.length === 0)
        throw new Error("Couldn't find suitable real places nearby for your goals within walk distance. Try adjusting your location or goals.");

      // Construct GPT formatting prompt with ONLY real data
      const gptPrompt = `
Below is a list of REAL venues found near the user's coordinates, with walking times calculated via Google Maps. Use ONLY these:

${filtered
  .map(
    (c, i) =>
      `${i + 1}. ${c.name}\nAddress: ${c.address}\nWalking: ${c.walkDistance} (${c.walkMinutes} min)`
  )
  .join("\n\n")}

User has ${options.time_window} and wants to: ${options.goals.join(", ")}.
Show one or more options that fit their time/goal, describe each in friendly bullet point style using the provided data (do not invent places/distances, do not use info not present above).`;

      // Call OpenAI with the real venue data, not a made-up prompt
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant. Only summarize the given real venues and walking info; do not invent any." },
            { role: "user", content: gptPrompt }
          ],
          temperature: 0.5,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI Error: ${errText}`);
      }
      const data = await res.json();
      return data.choices[0].message.content as string;
    } catch (err: any) {
      setError(err.message || "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { generateRoute, loading, error };
};
