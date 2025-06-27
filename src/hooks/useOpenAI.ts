
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

// Simple place count logic
const TIME_TO_PLACES = {
  "30 minutes": 1,
  "1 hour": 2,
  "1.5 hours": 2,
  "2+ hours": 3,
};

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
    console.log("Time window:", timeWindow);
    console.log("Regeneration attempt:", regenerationAttempt);
    
    // Use simple place count logic
    const placesCount = TIME_TO_PLACES[timeWindow as keyof typeof TIME_TO_PLACES] || 2;
    console.log("Places count based on time window:", placesCount);
    
    const systemPrompt = `
You are a LOCAL EXPERT for ${location}, Portugal with EXTENSIVE KNOWLEDGE of REAL walking distances and times.

CRITICAL: WALKING TIMES MUST BE REALISTIC AND ACCURATE

WALKING TIME EXAMPLES for ${location}:
${location === "Guimarães" ? `
- From city center (Largo do Toural) to Castelo de Guimarães: 12-15 minutes uphill walk
- From Largo do Toural to Paço dos Duques: 8-10 minutes walk  
- Between nearby cafés in historic center: 5-8 minutes walk
- To places outside historic center: 15-25+ minutes walk
- Consider that Guimarães historic center is compact but has hills and pedestrian areas
` : `
- Most Portuguese city centers: places within 2-3 blocks = 6-10 minutes walk
- Across main squares or avenues: 10-15 minutes walk
- From center to outskirts: 20-30+ minutes walk
- Account for pedestrian areas, hills, and actual street layout
`}

WALKING TIME CALCULATION RULES:
- Average walking speed: 4-5 km/h (normal pace)
- Add 2-3 minutes for hills, stairs, or complicated routes
- Historic Portuguese cities often have narrow streets and elevation changes
- Be CONSERVATIVE - it's better to overestimate than underestimate walking time
- If you're unsure, add 3-5 extra minutes to your estimate

EXAMPLES OF REALISTIC WALKING TIMES:
- Very close (same street/square): 3-5 minutes
- Nearby (2-3 blocks): 6-10 minutes  
- Medium distance (across city center): 10-18 minutes
- Far (edge of walkable area): 20-30+ minutes

LOCATION CONTEXT: ${location}, Portugal
${location === "Guimarães" ? `
- Historic city center around Largo do Toural
- Castelo area is uphill (12-15 minutes walk from center)
- Most cafés and restaurants within 6-10 minutes of main square
- Museums typically 8-12 minutes from center
- Consider elevation changes and pedestrian-only areas
- DO NOT underestimate walking times - Guimarães has hills and winding streets
` : `
- Focus on the main city center area
- Consider typical Portuguese city layout with main square as reference point
- Account for pedestrian areas and elevation changes
- Be realistic about distances - Portuguese cities are walkable but not tiny
`}

TARGET GOALS: ${goals.join(", ")}

${regenerationAttempt > 0 ? `
VARIATION ${regenerationAttempt + 1}:
- Suggest DIFFERENT well-known places than previous attempts
- Vary the geographic area within the city
- Mix popular and local favorites
` : ""}

RESPONSE FORMAT - Return EXACTLY this JSON structure:
[
  {
    "name": "Real business name",
    "address": "Complete Portuguese address with street number, ${location}, Portugal",
    "walkingTime": REALISTIC_minutes_from_city_center,
    "type": "specific_category_matching_goals",
    "reason": "Brief explanation of why this place is good for the selected goals"
  }
]

CRITICAL REQUIREMENTS:
- Provide exactly ${placesCount} suggestions
- Walking times MUST be realistic for ${location} geography - do NOT underestimate
- Use actual business names that exist in ${location}
- Include realistic Portuguese street addresses
- NO markdown formatting - ONLY valid JSON
- Do NOT include walking time information in the reason field

WALKING TIME VALIDATION:
- Double-check each walking time estimate
- Ask yourself: "Can I really walk this distance in this time in ${location}?"
- Remember: it's better to overestimate than to disappoint users with impossible times

Remember: Focus on accurate walking times but keep descriptions focused on why the place matches the user's goals.
`.trim();

    console.log("=== DEBUG: Simplified system prompt created ===");
    
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
        max_tokens: 400 + (placesCount * 100),
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
    
    // Validate places have essential fields
    const validPlaces = places.filter(place => {
      if (!place.name || !place.address || typeof place.walkingTime !== 'number') {
        console.warn("FILTERED: Missing essential fields:", place);
        return false;
      }
      return true;
    });
    
    console.log("=== DEBUG: Final places ===");
    console.log("Places count:", placesCount);
    console.log("Valid places count:", validPlaces.length);
    console.log("Valid places:", validPlaces);
    
    return validPlaces;
  }
  
  return { getLLMPlaces };
}
