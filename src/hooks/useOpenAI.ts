
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
  async function getLLMPlaces({
    location,
    goals,
    timeWindow,
    userPrompt,
    regenerationAttempt = 0,
    maxPlaces = 2,
  }: {
    location: string;
    goals: string[];
    timeWindow: string;
    userPrompt: string;
    regenerationAttempt?: number;
    maxPlaces?: number;
  }): Promise<LLMPlace[]> {
    
    console.log("=== DEBUG: useOpenAI getLLMPlaces called ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    console.log("User prompt:", userPrompt);
    console.log("Regeneration attempt:", regenerationAttempt);
    console.log("Max places:", maxPlaces);
    
    const systemPrompt = `
You are a local guide for ${location}, Portugal. Your task is to suggest REAL, EXISTING places with accurate addresses.

LOCATION: ${location}, Portugal

REQUIREMENTS:
1. All suggestions must be in ${location}, Portugal
2. Provide accurate, real addresses with postal codes
3. Only suggest places that actually exist
4. Include walking times from city center
5. Match the user's selected goals: ${goals.join(", ")}

${regenerationAttempt > 0 ? `
REGENERATION ${regenerationAttempt + 1}:
- Provide different places than previous attempts
- Different areas/neighborhoods of ${location}
` : ""}

GOALS EXPLANATION:
${goals.includes("restaurants") ? `
🍽️ RESTAURANTS: Find dining establishments, restaurants, bistros, eateries for meals and food.
` : ""}

${goals.includes("coffee") ? `
☕ COFFEE: Find coffee shops, cafés, specialty roasters, tea houses for beverages.
` : ""}

${goals.includes("work") ? `
💻 WORK: Find work-friendly places like cafés with wifi, coworking spaces, quiet locations.
` : ""}

${goals.includes("museums") ? `
🏛️ MUSEUMS: Find museums, art galleries, cultural centers with exhibitions.
` : ""}

${goals.includes("parks") ? `
🌳 PARKS: Find parks, gardens, green outdoor spaces for relaxation.
` : ""}

${goals.includes("monuments") ? `
🏰 MONUMENTS: Find architectural monuments, historical landmarks, heritage sites, castles, palaces.
` : ""}

RETURN FORMAT - JSON ONLY:
[
  {
    "name": "Real business/place name",
    "address": "Complete accurate address, ${location}, Portugal",
    "walkingTime": minutes_from_center,
    "type": "category",
    "reason": "why it matches the goals"
  }
]

Provide exactly ${maxPlaces} real places in ${location}. NO markdown, NO explanations, ONLY JSON.
`.trim();

    console.log("=== DEBUG: System prompt created ===");
    
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
            content: userPrompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 440 + (maxPlaces * 50),
      }),
    });
    
    if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()).slice(0, 220));
    const data = await res.json();
    const text = data.choices[0].message.content;
    
    console.log("=== DEBUG: OpenAI Response ===");
    console.log("Raw response:", text);
    
    let places: LLMPlace[] = [];
    try {
      // Try to extract JSON array from response
      const match = text.match(/\[.*?\]/s);
      if (match) {
        places = JSON.parse(match[0]);
      } else {
        const parsed = JSON.parse(
          text
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
      console.error("=== DEBUG: JSON Parse Error ===", err);
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0, 120));
    }
    
    if (!Array.isArray(places)) throw new Error("AI did not return a list of places.");
    
    // Basic validation - only check for essential requirements
    const locationName = location.toLowerCase();
    
    const validPlaces = places.filter(place => {
      if (!place.name || !place.address) {
        console.warn("FILTERED: Missing name or address:", place);
        return false;
      }
      
      const address = place.address.toLowerCase();
      
      // Only check that address contains the target location
      if (!address.includes(locationName)) {
        console.warn("FILTERED: Address doesn't contain location:", place.address);
        return false;
      }
      
      return true;
    });
    
    console.log("=== DEBUG: Final places ===");
    console.log("Original places count:", places.length);
    console.log("Valid places count:", validPlaces.length);
    console.log("Valid places:", validPlaces);
    
    return validPlaces;
  }
  
  return { getLLMPlaces };
}
