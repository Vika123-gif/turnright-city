
import { useState } from "react";
import { useOpenStreetMap } from "./useOpenStreetMap";

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
  const { searchPlaces, calculateWalkingTime } = useOpenStreetMap();

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
    
    console.log("=== DEBUG: useOpenAI getLLMPlaces called with OSM integration ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    
    // Use simple place count logic
    const placesCount = TIME_TO_PLACES[timeWindow as keyof typeof TIME_TO_PLACES] || 2;
    
    // Modified system prompt to focus on place names/types rather than specific addresses
    const systemPrompt = `
You are a LOCAL EXPERT for ${location}, Portugal with knowledge of businesses and places.

Your task: Suggest ${placesCount} place NAME(S) and TYPE(S) that match the user's goals.
Don't worry about exact addresses - we'll verify those separately.

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
    "name": "Business name or place name",
    "type": "specific_category_matching_goals",
    "reason": "Brief explanation of why this place is good for the selected goals"
  }
]

CRITICAL REQUIREMENTS:
- Provide exactly ${placesCount} suggestions
- Focus on place NAMES and TYPES, not addresses
- Use actual business names that likely exist in ${location}
- NO markdown formatting - ONLY valid JSON
- Don't include address or walking time information

Remember: We just need good place suggestions - addresses will be verified separately.
`.trim();

    console.log("=== DEBUG: Modified system prompt created ===");
    
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
        max_tokens: 300 + (placesCount * 80),
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
    
    let aiSuggestions: any[] = [];
    try {
      const match = text.match(/\[.*?\]/s);
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
    } catch (err) {
      console.error("=== DEBUG: JSON Parse Error ===", err);
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0, 120));
    }
    
    console.log("=== DEBUG: AI Suggestions ===", aiSuggestions);
    
    // Now use OpenStreetMap to find real addresses for these suggestions
    const verifiedPlaces: LLMPlace[] = [];
    
    // Get origin coordinates if location is a string
    let originLat = 0, originLon = 0;
    if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location)) {
      [originLat, originLon] = location.split(',').map(coord => parseFloat(coord.trim()));
    } else {
      // Try to get coordinates for the city
      try {
        const citySearch = await searchPlaces(location, "", 1);
        if (citySearch.length > 0) {
          originLat = citySearch[0].lat;
          originLon = citySearch[0].lon;
        }
      } catch (error) {
        console.warn("Could not get city coordinates:", error);
      }
    }
    
    console.log("=== DEBUG: Origin coordinates ===", { originLat, originLon });
    
    // Search for each AI suggestion using OpenStreetMap
    for (const suggestion of aiSuggestions) {
      console.log("=== DEBUG: Searching OSM for ===", suggestion);
      
      try {
        // Create search query based on suggestion type and goals
        let searchQuery = suggestion.name;
        if (suggestion.type) {
          searchQuery += ` ${suggestion.type}`;
        }
        
        // Add goal-based search terms
        if (goals.includes('restaurants')) searchQuery += ' restaurant dining';
        if (goals.includes('coffee')) searchQuery += ' cafe coffee';
        if (goals.includes('work')) searchQuery += ' coworking wifi';
        if (goals.includes('museums')) searchQuery += ' museum gallery';
        if (goals.includes('parks')) searchQuery += ' park garden';
        if (goals.includes('monuments')) searchQuery += ' monument castle historic';
        
        const osmResults = await searchPlaces(searchQuery, location, 3);
        console.log("=== DEBUG: OSM results for", suggestion.name, ":", osmResults);
        
        if (osmResults.length > 0) {
          const bestMatch = osmResults[0];
          
          // Calculate walking time if we have origin coordinates
          let walkingTime = 15; // Default fallback
          if (originLat && originLon) {
            walkingTime = await calculateWalkingTime(originLat, originLon, bestMatch.lat, bestMatch.lon);
          }
          
          verifiedPlaces.push({
            name: suggestion.name,
            address: bestMatch.address,
            walkingTime,
            type: suggestion.type,
            reason: suggestion.reason,
            lat: bestMatch.lat,
            lon: bestMatch.lon
          });
        } else {
          // Fallback: use AI suggestion with estimated data
          console.warn("No OSM results for", suggestion.name, "- using AI fallback");
          verifiedPlaces.push({
            name: suggestion.name,
            address: `${suggestion.name}, ${location}, Portugal`,
            walkingTime: 15, // Default estimate
            type: suggestion.type,
            reason: suggestion.reason
          });
        }
      } catch (error) {
        console.error("Error processing suggestion", suggestion.name, ":", error);
        // Fallback: use AI suggestion
        verifiedPlaces.push({
          name: suggestion.name,
          address: `${suggestion.name}, ${location}, Portugal`,
          walkingTime: 15,
          type: suggestion.type,
          reason: suggestion.reason
        });
      }
    }
    
    console.log("=== DEBUG: Final verified places ===");
    console.log("Verified places:", verifiedPlaces);
    
    return verifiedPlaces;
  }
  
  return { getLLMPlaces };
}
