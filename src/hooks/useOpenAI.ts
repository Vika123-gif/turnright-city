
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
  const { getNearbyPlaces } = useGooglePlaces();

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
    
    console.log("=== DEBUG: useOpenAI getLLMPlaces called with Google Places integration ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    
    // Use Google Places API directly for better results
    try {
      const googlePlaces = await getNearbyPlaces({
        location,
        goals,
        timeWindow
      });

      console.log("=== DEBUG: Google Places results ===", googlePlaces);

      // Convert Google Places results to LLMPlace format
      const llmPlaces: LLMPlace[] = googlePlaces.map((place, index) => ({
        name: place.name,
        address: place.address,
        walkingTime: place.walkingTime,
        type: place.type,
        reason: `Great ${place.type || 'place'} for your selected goals`,
      }));

      console.log("=== DEBUG: Final LLM places ===", llmPlaces);
      
      return llmPlaces;
      
    } catch (error) {
      console.error("Error getting Google Places:", error);
      
      // Fallback to AI-only suggestions if Google Places fails
      return await getAIOnlyPlaces({
        location,
        goals,
        timeWindow,
        userPrompt,
        regenerationAttempt,
        maxPlaces
      });
    }
  }

  // Fallback AI-only function
  async function getAIOnlyPlaces({
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
    
    console.log("=== DEBUG: Fallback to AI-only suggestions ===");
    
    // Use simple place count logic
    const placesCount = TIME_TO_PLACES[timeWindow as keyof typeof TIME_TO_PLACES] || 2;
    
    const systemPrompt = `
You are a LOCAL EXPERT for ${location}, Portugal with knowledge of businesses and places.

Your task: Suggest ${placesCount} specific place(s) with exact addresses that match the user's goals.

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
    "name": "Exact business name",
    "address": "Full street address including postal code, city, Portugal",
    "walkingTime": estimated_walking_minutes_as_number,
    "type": "specific_category_matching_goals",
    "reason": "Brief explanation of why this place is good for the selected goals"
  }
]

CRITICAL REQUIREMENTS:
- Provide exactly ${placesCount} suggestions
- Use REAL business names and EXACT addresses that exist in ${location}
- Include full addresses with street, postal code, city, Portugal
- NO markdown formatting - ONLY valid JSON
- Walking times should be realistic estimates

Remember: Provide complete, accurate information for real places.
`.trim();

    console.log("=== DEBUG: AI fallback system prompt created ===");
    
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
      
      console.log("=== DEBUG: AI Fallback Suggestions ===", aiSuggestions);
      return aiSuggestions as LLMPlace[];
      
    } catch (err) {
      console.error("=== DEBUG: JSON Parse Error ===", err);
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0, 120));
    }
  }
  
  return { getLLMPlaces };
}
