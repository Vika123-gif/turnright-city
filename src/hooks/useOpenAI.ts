
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
You are a LOCAL EXPERT for ${location}, Portugal with extensive knowledge of real businesses and places.

CRITICAL INSTRUCTIONS:
1. You MUST suggest only REAL, EXISTING places that you know from your training data
2. Provide the most well-known and established businesses in ${location}
3. Use actual business names, not generic descriptions
4. Include the complete street address format used in Portugal
5. Focus on popular, frequently visited places that tourists and locals know

LOCATION CONTEXT: ${location}, Portugal
- This is a historic Portuguese city
- Provide places within the city center and nearby neighborhoods
- Walking times should be realistic from the city center (Largo do Toural area for Guimarães)

TARGET GOALS: ${goals.join(", ")}

${regenerationAttempt > 0 ? `
VARIATION ${regenerationAttempt + 1}:
- Suggest DIFFERENT well-known places than previous attempts
- Focus on other popular areas of ${location}
- Include places locals frequent, not just tourist spots
` : ""}

BUSINESS CATEGORIES TO FOCUS ON:

${goals.includes("restaurants") ? `
🍽️ RESTAURANTS: Well-established restaurants, tascas, traditional Portuguese eateries
Examples for reference: Casa do Bacalhau, Restaurante Solar do Bacalhau, traditional Portuguese restaurants
` : ""}

${goals.includes("coffee") ? `
☕ COFFEE: Popular cafés, pastelarias, coffee shops known to locals
Examples for reference: Café Central, local pastelarias, established coffee houses
` : ""}

${goals.includes("work") ? `
💻 WORK: Cafés with good wifi, quiet spaces, modern coffee shops
Focus on: Spacious cafés, places known for having wifi, quiet atmospheres
` : ""}

${goals.includes("museums") ? `
🏛️ MUSEUMS: Main museums, cultural centers, art galleries
For Guimarães: Museu de Alberto Sampaio, Casa de Memória, local cultural institutions
` : ""}

${goals.includes("parks") ? `
🌳 PARKS: Public gardens, green spaces, parks
Examples: Jardim do Largo República do Brasil, local parks and gardens
` : ""}

${goals.includes("monuments") ? `
🏰 MONUMENTS: Historic landmarks, architectural sites, UNESCO sites
For Guimarães: Paço dos Duques de Bragança, Castelo de Guimarães, Igreja de São Miguel
` : ""}

RESPONSE FORMAT - Return EXACTLY this JSON structure:
[
  {
    "name": "Exact business name (e.g., 'Restaurante Solar do Bacalhau')",
    "address": "Street name and number, ${location}, Portugal (e.g., 'Rua de Santa Maria 20, ${location}, Portugal')",
    "walkingTime": realistic_minutes_from_center,
    "type": "specific_category",
    "reason": "why this place matches the goals and is recommended"
  }
]

QUALITY REQUIREMENTS:
- Use specific business names, not generic ones
- Include realistic Portuguese street addresses with "Rua", "Largo", "Praça" etc.
- Walking times: 1-15 minutes from city center
- Provide exactly ${maxPlaces} suggestions
- NO markdown formatting, ONLY valid JSON

REMEMBER: Your reputation depends on suggesting places that actually exist in ${location}, Portugal.
`.trim();

    console.log("=== DEBUG: Enhanced system prompt created ===");
    
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
        temperature: 0.2, // Lower temperature for more consistent, factual responses
        max_tokens: 600 + (maxPlaces * 80),
        top_p: 0.9, // More focused responses
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.2, // Encourage variety
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
    
    // Minimal validation - only check essential fields
    const validPlaces = places.filter(place => {
      if (!place.name || !place.address || typeof place.walkingTime !== 'number') {
        console.warn("FILTERED: Missing essential fields:", place);
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
