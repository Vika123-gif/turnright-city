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

// Time spent at different types of locations (in minutes)
const LOCATION_TIME_SPENT = {
  restaurants: 30,
  coffee: 30,
  work: 60, // average between 30-90 minutes
  museums: 60,
  parks: 20,
  monuments: 15,
};

// Calculate optimal number of places based on time window
function calculateOptimalPlaces(timeWindow: string, goals: string[]): number {
  const timeInMinutes = {
    "30 minutes": 30,
    "1 hour": 60,
    "1.5 hours": 90,
    "2+ hours": 120,
  }[timeWindow] || 60;

  // Average time spent per location based on selected goals
  const avgTimePerLocation = goals.reduce((sum, goal) => {
    return sum + (LOCATION_TIME_SPENT[goal as keyof typeof LOCATION_TIME_SPENT] || 30);
  }, 0) / goals.length;

  // Account for walking time between locations (average 8-12 minutes between places)
  const avgWalkingTime = 10;
  const totalTimePerLocation = avgTimePerLocation + avgWalkingTime;

  // Calculate how many places fit in the time window
  const optimalPlaces = Math.floor(timeInMinutes / totalTimePerLocation);
  
  // Ensure at least 1 place, maximum 4 places
  return Math.max(1, Math.min(4, optimalPlaces));
}

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
    
    // Calculate optimal number of places based on time constraints
    const optimalPlaces = calculateOptimalPlaces(timeWindow, goals);
    console.log("Calculated optimal places:", optimalPlaces);
    
    const systemPrompt = `
You are a LOCAL EXPERT for ${location}, Portugal with EXTENSIVE KNOWLEDGE of REAL walking distances and times.

CRITICAL: WALKING TIMES MUST BE REALISTIC AND ACCURATE

WALKING TIME EXAMPLES for ${location}:
${location === "Guimarães" ? `
- From city center (Largo do Toural) to Castelo de Guimarães: 8-12 minutes uphill walk
- From Largo do Toural to Paço dos Duques: 6-9 minutes walk  
- Between nearby cafés in historic center: 4-7 minutes walk
- To places outside historic center: 10-20+ minutes walk
- Consider that Guimarães historic center is compact but has hills and pedestrian areas
` : `
- Most Portuguese city centers: places within 2-3 blocks = 5-8 minutes walk
- Across main squares or avenues: 8-12 minutes walk
- From center to outskirts: 15-25+ minutes walk
- Account for pedestrian areas, hills, and actual street layout
`}

WALKING TIME CALCULATION RULES:
- Average walking speed: 4-5 km/h (normal pace)
- Add 1-2 minutes for hills, stairs, or complicated routes
- Historic Portuguese cities often have narrow streets and elevation changes
- Be CONSERVATIVE - it's better to overestimate than underestimate walking time
- If you're unsure, add 2-3 extra minutes to your estimate

EXAMPLES OF REALISTIC WALKING TIMES:
- Very close (same street/square): 2-4 minutes
- Nearby (2-3 blocks): 5-8 minutes  
- Medium distance (across city center): 8-15 minutes
- Far (edge of walkable area): 15-25+ minutes

TIME CONSTRAINTS ANALYSIS:
- Available time: ${timeWindow}
- Time spent per location type:
  ${goals.includes("restaurants") ? "🍽️ Restaurants: 30 minutes" : ""}
  ${goals.includes("coffee") ? "☕ Coffee: 30 minutes" : ""}
  ${goals.includes("work") ? "💻 Work: 60 minutes average" : ""}
  ${goals.includes("museums") ? "🏛️ Museums: 60 minutes" : ""}
  ${goals.includes("parks") ? "🌳 Parks: 20 minutes" : ""}
  ${goals.includes("monuments") ? "🏰 Monuments: 15 minutes" : ""}

- Optimal number of places for this time window: ${optimalPlaces}

ROUTE OPTIMIZATION:
- Suggest exactly ${optimalPlaces} places that fit within ${timeWindow}
- Consider the TOTAL journey time including:
  * REALISTIC walking time to each place from city center
  * Time spent at each place
  * Walking time between places
- Arrange places in a logical geographic sequence to minimize total walking

LOCATION CONTEXT: ${location}, Portugal
${location === "Guimarães" ? `
- Historic city center around Largo do Toural
- Castelo area is uphill (8-12 minutes walk from center)
- Most cafés and restaurants within 5-8 minutes of main square
- Museums typically 6-10 minutes from center
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
    "reason": "Brief explanation of why this fits the time and goals"
  }
]

CRITICAL REQUIREMENTS:
- Provide exactly ${optimalPlaces} suggestions
- Walking times MUST be realistic for ${location} geography - do NOT underestimate
- Total route should fit comfortably within ${timeWindow} including ALL walking and activity time
- Use actual business names that exist in ${location}
- Include realistic Portuguese street addresses
- NO markdown formatting - ONLY valid JSON

WALKING TIME VALIDATION:
- Double-check each walking time estimate
- Ask yourself: "Can I really walk this distance in this time in ${location}?"
- Remember: it's better to overestimate than to disappoint users with impossible times

Remember: This route must actually work within ${timeWindow} including all walking and activity time.
`.trim();

    console.log("=== DEBUG: Enhanced realistic walking time system prompt created ===");
    
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
        temperature: 0.05, // Even lower for more consistent, factual responses
        max_tokens: 400 + (optimalPlaces * 100),
        top_p: 0.7, // More focused responses
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
    console.log("Optimal places calculated:", optimalPlaces);
    console.log("Valid places count:", validPlaces.length);
    console.log("Valid places:", validPlaces);
    
    return validPlaces;
  }
  
  return { getLLMPlaces };
}
