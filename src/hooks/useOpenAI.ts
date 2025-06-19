
import { useState } from "react";

export type LLMPlace = {
  name: string;
  address: string;
  walkingTime: number;
  type?: string;
  reason?: string;
};

// Inserted user-provided OpenAI API key below.
// Make sure this string only contains standard ASCII characters, no invisible whitespace!
const OPENAI_API_KEY =
  "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";

export function useOpenAI() {
  // Simpler hook: only calls API, leaves prompt to consumer
  async function getLLMPlaces({
    location,
    goals,
    timeWindow,
    userPrompt,
  }: {
    location: string;
    goals: string[];
    timeWindow: string;
    userPrompt: string;
  }): Promise<LLMPlace[]> {
    // Enhanced system prompt with specific business type mapping
    const systemPrompt = `
You are a business travel assistant specialized in recommending appropriate venues based on user goals.

BUSINESS TYPE MAPPING:
- "work" = coworking spaces, business centers, libraries with work areas, quiet cafes with dedicated workspaces (NOT regular restaurants)
- "coffee" = coffee shops, specialty cafes, roasters
- "eat" = restaurants, food courts, eateries, bistros
- "explore" = local attractions, unique venues, cultural spots, interesting neighborhoods

MULTI-GOAL RECOMMENDATIONS:
- If user selects multiple goals, prioritize venues that serve multiple purposes
- Example: work + coffee = coworking cafes, business centers with cafes, libraries with coffee
- Example: eat + explore = unique restaurants, local food markets, rooftop dining with views
- Example: work + eat = business districts with lunch spots, coworking spaces with restaurants nearby

VENUE REQUIREMENTS:
- For "work": Must have wifi, quiet environment, power outlets, work-friendly atmosphere
- For "coffee": Focus on coffee quality, atmosphere, seating
- For "eat": Focus on food quality, cuisine type, dining experience
- For "explore": Focus on uniqueness, local character, interesting features

Always respond with a valid, compact JSON array (no markdown, no comments).
Each object must follow this exact structure:
{
  "name": string,            // Name of the place (required)
  "address": string,         // Full address (required)
  "walkingTime": number,     // Walking time in minutes (required)
  "type": string,            // Specific business type like "coworking space", "specialty cafe", "local restaurant" (required)
  "reason": string           // Why it fits the user's specific goals (required)
}

Return 1-2 realistic venues that precisely match the user's goals. Be specific about business types.
`.trim();

    const prompt = userPrompt;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()).slice(0, 220));
    const data = await res.json();
    const text = data.choices[0].message.content;
    let places: LLMPlace[] = [];
    try {
      // Try to extract just the array, if possible
      const match = text.match(/\[.*?\]/s);
      if (match) {
        places = JSON.parse(match[0]);
      } else {
        // Try parsing as object or array
        const parsed = JSON.parse(
          text
            // Remove markdown code block formatting if present
            .replace(/^```json|^```|```$/g, "")
            .trim()
        );
        if (Array.isArray(parsed)) {
          places = parsed;
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.places)) {
          places = parsed.places;
        } else {
          throw new Error("AI did not return a list of places.");
        }
      }
    } catch (err) {
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0, 120));
    }
    if (!Array.isArray(places)) throw new Error("AI did not return a list of places.");
    return places;
  }
  return { getLLMPlaces };
}
