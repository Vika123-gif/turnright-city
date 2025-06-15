
import { useState } from "react";

export type LLMPlace = {
  name: string;
  address: string;
  walkingTime: number;
  type: string;
};

function createPrompt({
  location, goals, timeWindow
}: {
  location: string,
  goals: string[],
  timeWindow: string,
}) {
  return `
You are an intelligent travel planner. Given the following info, generate a list (3-5) of interesting places for a business traveler to visit in the next ${timeWindow}.
Base all results within a 12-min walk radius, use location context: "${location}".

For each place:
- Include a short name (creative + local-sounding), an address (invented but plausible for the area), a walking time in minutes (random 3-12), and a type from: ${goals.join(", ")}.
- Do NOT return explanations, just JSON as example below:

[
  {"name": "Café du Midi", "address": "18 Rue de Lyon, Paris", "walkingTime": 8, "type": "coffee"},
  {"name": "Parc des Artisans", "address": "22 Boulevard Magenta, Paris", "walkingTime": 5, "type": "explore"}
]

Include at least 1 place per selected activity/goal if possible. 
Do NOT suggest tourist clichés unless relevant. Stick closely to the area.
Be truly local and realistic. Short, creative, and plausible output only. Return JUST the JSON list!`;
}

export function useOpenAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getLLMPlaces(opts: {
    apiKey: string;
    location: string;
    goals: string[];
    timeWindow: string;
  }): Promise<LLMPlace[]> {
    setLoading(true);
    setError(null);
    try {
      const prompt = createPrompt(opts);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You generate plausible, highly local, activity-based route suggestions for business travelers." },
            { role: "user", content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 520,
          stop: null,
        })
      });

      if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()).slice(0, 220));

      const data = await res.json();
      // Try to extract the first JSON block from the response text
      const text = data.choices[0].message.content;
      let places: LLMPlace[] = [];
      try {
        const match = text.match(/\[.*?\]/s);
        if (match) places = JSON.parse(match[0]);
        else places = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error("Could not parse LLM output: " + text?.slice(0,120));
      }
      if (!Array.isArray(places) || places.length === 0)
        throw new Error("LLM did not return plausible places.");
      return places as LLMPlace[];
    } catch (err: any) {
      setError(err.message || "OpenAI error");
      return [];
    } finally {
      setLoading(false);
    }
  }
  return { loading, error, getLLMPlaces };
}
