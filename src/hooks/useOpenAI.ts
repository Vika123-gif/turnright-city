
import { useState } from "react";
import { useGooglePlaces } from "./useGooglePlaces";

export type LLMPlace = {
  name: string;
  address: string;
  walkingTime: number;
  type?: string;
  reason?: string;
  lat?: number;
  lon?: number;
};

// Inserted user-provided OpenAI API key below.
// Make sure this string only contains standard ASCII characters, no invisible whitespace!
const OPENAI_API_KEY =
  "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";

// Simple place count logic
const TIME_TO_PLACES = {
  "30 minutes": 1,
  "1 hour": 2,
  "1.5 hours": 2,
  "2+ hours": 3,
};

export function useOpenAI() {
  const { searchPlacesByName } = useGooglePlaces();

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
    
    console.log("=== DEBUG: useOpenAI getLLMPlaces called with AI + Google Places ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    
    // First, get place suggestions from OpenAI
    const aiSuggestions = await getAIPlaceSuggestions({
      location,
      goals,
      timeWindow,
      userPrompt,
      regenerationAttempt,
      maxPlaces
    });

    console.log("=== DEBUG: AI Suggestions ===", aiSuggestions);

    // Then, use Google Places to find real addresses for these suggestions
    const placesWithRealAddresses: LLMPlace[] = [];

    for (const suggestion of aiSuggestions) {
      try {
        console.log(`Searching Google Places for: ${suggestion.name} near ${location}`);
        
        const googleResults = await searchPlacesByName({
          placeName: suggestion.name,
          location: location,
          placeType: suggestion.type
        });

        if (googleResults.length > 0) {
          // Use the first (best) result from Google Places
          const googlePlace = googleResults[0];
          placesWithRealAddresses.push({
            name: googlePlace.name,
            address: googlePlace.address,
            walkingTime: googlePlace.walkingTime,
            type: suggestion.type,
            reason: suggestion.reason,
          });
        } else {
          // Fallback to AI suggestion if Google Places doesn't find it
          console.log(`No Google Places results for ${suggestion.name}, using AI fallback`);
          placesWithRealAddresses.push(suggestion);
        }
      } catch (error) {
        console.error(`Error searching Google Places for ${suggestion.name}:`, error);
        // Use AI suggestion as fallback
        placesWithRealAddresses.push(suggestion);
      }
    }

    console.log("=== DEBUG: Final places with real addresses ===", placesWithRealAddresses);
    
    return placesWithRealAddresses;
  }

  // Get place suggestions from OpenAI
  async function getAIPlaceSuggestions({
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
    
    console.log("=== DEBUG: Getting AI place suggestions ===");
    
    // Use simple place count logic
    const placesCount = TIME_TO_PLACES[timeWindow as keyof typeof TIME_TO_PLACES] || 2;
    
    const systemPrompt = `
You are a LOCAL EXPERT for ${location}, Portugal with knowledge of businesses and places.

Your task: Suggest ${placesCount} specific place(s) that match the user's goals. Focus on suggesting REAL place names that exist.

LOCATION CONTEXT: ${location}, Portugal
TARGET GOALS: ${goals.join(", ")}

${regenerationAttempt > 0 ? `
VARIATION ${regenerationAttempt + 1}:
- Suggest DIFFERENT places than previous attempts
- Vary the type of establishments
- Mix popular and local favorites
` : ""}

RESPONSE FORMAT - Return EXACTLY this JSON structure:
[
  {
    "name": "Specific business or place name (e.g., 'Café Central', 'Museu Nacional')",
    "address": "General area or street name",
    "walkingTime": estimated_walking_minutes_as_number,
    "type": "specific_category_matching_goals",
    "reason": "Brief explanation of why this place is good for the selected goals"
  }
]

CRITICAL REQUIREMENTS:
- Provide exactly ${placesCount} suggestions
- Focus on REAL place names that likely exist in ${location}
- Use specific business names when possible (not generic descriptions)
- NO markdown formatting - ONLY valid JSON
- Walking times should be realistic estimates (5-15 minutes)

Remember: Suggest real place names that Google Places API can likely find.
`.trim();

    console.log("=== DEBUG: AI system prompt created ===");
    
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
        max_tokens: 300 + (placesCount * 100),
        top_p: 0.8,
        frequency_penalty: 0.3,
        presence_penalty: 0.2,
      }),
    });
    
    if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()).slice(0, 220));
    const data = await res.json();
    const text = data.choices[0].message.content;
    
    console.log("=== DEBUG: OpenAI Response ===");
    console.log("Raw response:", text);
    
    try {
      const match = text.match(/\[.*?\]/s);
      let aiSuggestions: any[] = [];
      
      if (match) {
        aiSuggestions = JSON.parse(match[0]);
      } else {
        const parsed = JSON.parse(
          text
            .replace(/^```json|^```|```$/g, "")
            .trim()
        );
        if (Array.isArray(parsed)) {
          aiSuggestions = parsed;
        } else {
          throw new Error("AI did not return a list of places.");
        }
      }
      
      console.log("=== DEBUG: AI Place Suggestions ===", aiSuggestions);
      return aiSuggestions as LLMPlace[];
      
    } catch (err) {
      console.error("=== DEBUG: JSON Parse Error ===", err);
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0, 120));
    }
  }
  
  return { getLLMPlaces };
}
