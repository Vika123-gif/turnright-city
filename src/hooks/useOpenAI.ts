
import { useState } from "react";
import { useGooglePlaces } from "./useGooglePlaces";

/**
 * Uses the Edge Function to get real places, then asks GPT to format the list.
 */
export const useOpenAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send ONLY real places for formatting
  async function generateRoute(options: {
    location: string;  // "lat,lng"
    time_window: string; // human readable, eg. "10:00-12:00" or "2 hours"
    goals: string[];
    apiKey?: string; // Not needed anymore
  }) {
    setLoading(true);
    setError(null);
    try {
      // Fetch real places using our backend
      const { getNearbyPlaces } = useGooglePlaces();
      const realPlaces = await getNearbyPlaces({
        location: options.location,
        goals: options.goals,
        timeWindow: options.time_window,
      });

      if (!realPlaces.length) {
        throw new Error("Couldn't find suitable real places nearby for your goals within walk distance. Try adjusting your location or goals.");
      }

      // Format the prompt for GPT - only ask it to describe these actual venues
      const gptPrompt =
        `Below is a list of REAL venues found near the user's coordinates, with walking times via Google Maps. Use ONLY these for recommendations—do NOT invent places or walking times.\n\n` +
        realPlaces.map((c, i) => (
          `${i + 1}. ${c.name}\nAddress: ${c.address}\nWalking: ${c.walkingTime} min`
        )).join("\n\n") +
        `\n\nThe user has ${options.time_window} and wants to: ${options.goals.join(", ")}.\n` +
        `Show one or more options that fit their time and goal, describe each in friendly bullet point style using the provided data (do not invent places/distances; use only what is above).`;

      // Send to OpenAI for bulletpoint formatting only
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          // The API key (if present) should be your backend's, not the user’s!
          "Authorization": options.apiKey ? `Bearer ${options.apiKey}` : "",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant. Only summarize the given real venues and walking info; do not invent any new information." },
            { role: "user", content: gptPrompt }
          ],
          temperature: 0.5,
          max_tokens: 400,
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
