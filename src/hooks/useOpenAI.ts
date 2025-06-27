
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
    console.log("Location type:", typeof location);
    console.log("Location length:", location.length);
    console.log("Goals received in hook:", goals);
    console.log("Goals type:", typeof goals);
    console.log("Goals is array:", Array.isArray(goals));
    console.log("Goals length:", goals?.length);
    console.log("User prompt:", userPrompt);
    console.log("Regeneration attempt:", regenerationAttempt);
    console.log("Max places:", maxPlaces);
    
    // EXTREME ULTRA-STRICT system prompt with ZERO TOLERANCE for fake addresses
    const systemPrompt = `
🚨 CRITICAL MISSION: ONLY SUGGEST BUSINESSES THAT ACTUALLY EXIST 🚨

User's location: ${location}

⚠️ ABSOLUTE ZERO-TOLERANCE ADDRESS POLICY - THIS IS LIFE OR DEATH CRITICAL:
- You can ONLY suggest businesses if you are 1000% CERTAIN they exist in real life
- You can ONLY use addresses that you KNOW are completely accurate and verified
- NEVER EVER guess addresses, NEVER make up street numbers, NEVER fabricate locations
- If you are not ABSOLUTELY CERTAIN about an address, DO NOT include that place
- Better to return ZERO results than ONE single fake address
- Each address must be for a REAL, OPERATING, CURRENTLY-EXISTING business at that EXACT location
- DO NOT suggest "Restaurante Histórico" or other generic names - these are FAKE
- DO NOT suggest places on "Largo do Toural" unless you can verify the EXACT business name and number

🚨 BUSINESS VERIFICATION REQUIREMENTS (MANDATORY):
- ONLY suggest world-famous chains (McDonald's, Starbucks, etc.) OR extremely well-known local establishments
- ONLY use businesses with VERIFIED online presence and reviews
- Examples of SAFE suggestions: major hotel chains, international restaurant chains, famous historical sites with official names
- NEVER create fictional business names like "Café Milenário" or "Fábrica do Chocolate"
- NEVER suggest places that "sound right" but you're not certain about

🚨 LOCATION ENFORCEMENT - ABSOLUTELY NO EXCEPTIONS:
- If user says "Guimarães" - ALL places MUST be in Guimarães, Portugal ONLY
- NEVER EVER suggest places in Vila Nova de Famalicão, Barcelos, Braga, Porto, or ANY other city
- Triple-check: Is this business actually located in ${location} and nowhere else?
- Quadruple-check: Does this address contain "${location}" and no other city names?

🚨 ADDRESS ACCURACY VERIFICATION (MANDATORY):
- Every single address must be 100% accurate down to the street number
- You must be able to guarantee someone can find this exact business at this exact address
- If you have ANY doubt about the street number or exact location, EXCLUDE that place
- Cross-reference: Does this business name actually exist at this specific address?

🚨 GEOGRAPHIC DISTRIBUTION:
- Places MUST be in DIFFERENT neighborhoods of ${location}
- NEVER suggest places on the same street or within 200 meters
- Ensure significant walking distance between suggestions

🚨 QUANTITY REQUIREMENT:
- You MUST return EXACTLY ${maxPlaces} place${maxPlaces > 1 ? 's' : ''}
- If you cannot find ${maxPlaces} places with 100% verified addresses, return fewer
- NEVER return more than ${maxPlaces}

${regenerationAttempt > 0 ? `
🔄 REGENERATION - ATTEMPT ${regenerationAttempt + 1}:
- Provide COMPLETELY DIFFERENT places than previous attempts
- Use DIFFERENT streets and neighborhoods
- All verification rules still apply 1000%
` : ""}

GOAL ENFORCEMENT:
User's selected goals: ${goals.join(", ")}

${goals.includes("eat") ? `
🍽️ EATING GOAL:
- ONLY suggest VERIFIED restaurants with confirmed addresses in ${location}
- Examples: established restaurants with online reviews, hotel restaurants, chain restaurants
- NEVER suggest unknown or unverified eateries
` : ""}

${goals.includes("coffee") ? `
☕ COFFEE GOAL:
- ONLY suggest VERIFIED coffee shops with confirmed addresses in ${location}
- Examples: international chains, hotel cafés, well-established local cafés with online presence
- NEVER suggest unknown coffee shops or made-up café names
` : ""}

${goals.includes("explore") ? `
🏛️ EXPLORATION GOAL:
- ONLY suggest VERIFIED museums, galleries, historical sites in ${location}
- Examples: official museums, UNESCO sites, government-recognized historical landmarks
- NEVER suggest unofficial or unverified attractions
` : ""}

${goals.includes("work") ? `
💻 WORK GOAL:
- ONLY suggest VERIFIED work-friendly locations in ${location}
- Examples: hotel lobbies, established cafés with confirmed wifi, official coworking spaces
- NEVER suggest unverified work locations
` : ""}

🚨 FINAL MANDATORY VERIFICATION CHECKLIST:
Before including ANY place, you MUST verify:
✓ Does this EXACT business name exist in real life at this EXACT address?
✓ Can I guarantee someone will find this business at this precise location?
✓ Is this business actually located in ${location} and nowhere else?
✓ Have I verified this is not a made-up or fictional establishment?
✓ Does this match the user's goals exactly?
✓ Are places in genuinely different areas of ${location}?

If ANY answer is NO, UNCERTAIN, or "PROBABLY", IMMEDIATELY REMOVE that suggestion.

🚨 BANNED EXAMPLES (NEVER SUGGEST THESE):
- "Restaurante Histórico, Largo do Toural" (FAKE)
- "Café Milenário" (FAKE)
- "Fábrica do Chocolate, Rua de Paio Galvão" (WRONG CITY)
- Any business you're not 1000% certain exists

REMEMBER: It's better to return 0 results than 1 fake address. Quality over quantity.

OUTPUT FORMAT - RETURN ONLY JSON:
[
  {
    "name": "VERIFIED real business name that definitely exists",
    "address": "100% accurate verified address, ${location}, Portugal",
    "walkingTime": number_in_minutes,
    "type": "category",
    "reason": "why it matches user goals"
  }
]

NO markdown, NO explanations, ONLY the JSON array with VERIFIED real businesses.
`.trim();

    console.log("=== DEBUG: Extreme ultra-strict system prompt ===");
    console.log("System prompt includes location:", location);
    console.log("System prompt includes goals:", goals);
    console.log("System prompt includes regeneration attempt:", regenerationAttempt);
    
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
        temperature: 0.0, // Absolutely no creativity - only facts
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
      console.error("=== DEBUG: JSON Parse Error ===", err);
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0, 120));
    }
    
    if (!Array.isArray(places)) throw new Error("AI did not return a list of places.");
    
    // Enhanced client-side validation with stricter checks
    const locationName = location.toLowerCase();
    
    // Check for forbidden fake business names
    const forbiddenNames = [
      'restaurante histórico',
      'café milenário', 
      'fábrica do chocolate',
      'restaurante tradicional',
      'café central',
      'pastelaria regional'
    ];
    
    const invalidPlaces = places.filter(place => {
      const placeName = place.name?.toLowerCase() || '';
      const address = place.address?.toLowerCase() || '';
      
      // Check for forbidden fake names
      const hasForbiddenName = forbiddenNames.some(forbidden => placeName.includes(forbidden));
      
      // Check location requirements
      const hasLocation = address.includes(locationName);
      
      // Additional check for common wrong cities near Guimarães
      const wrongCities = ['famalicão', 'barcelos', 'braga', 'porto'];
      const hasWrongCity = wrongCities.some(city => address.includes(city));
      
      // Check for generic/suspicious addresses
      const isSuspiciousAddress = address.includes('largo do toural') && !placeName.includes('hotel') && !placeName.includes('pousada');
      
      return hasForbiddenName || !hasLocation || hasWrongCity || isSuspiciousAddress;
    });
    
    if (invalidPlaces.length > 0) {
      console.error("=== DEBUG: Invalid places detected ===");
      console.error("Expected location:", location);
      console.error("Invalid places:", invalidPlaces);
      
      // Filter out ALL invalid places
      places = places.filter(place => {
        const placeName = place.name?.toLowerCase() || '';
        const address = place.address?.toLowerCase() || '';
        
        const hasForbiddenName = forbiddenNames.some(forbidden => placeName.includes(forbidden));
        const hasLocation = address.includes(locationName);
        const wrongCities = ['famalicão', 'barcelos', 'braga', 'porto'];
        const hasWrongCity = wrongCities.some(city => address.includes(city));
        const isSuspiciousAddress = address.includes('largo do toural') && !placeName.includes('hotel') && !placeName.includes('pousada');
        
        return !hasForbiddenName && hasLocation && !hasWrongCity && !isSuspiciousAddress;
      });
      
      if (places.length === 0) {
        throw new Error(`No valid places found in ${location}. The AI suggested invalid or fake businesses. Please try again with different goals or try a regeneration.`);
      }
    }
    
    // Geographic distribution validation
    if (places.length > 1) {
      const addresses = places.map(p => p.address);
      const streets = addresses.map(addr => addr.split(',')[0]); // Get street part
      const uniqueStreets = new Set(streets);
      
      if (uniqueStreets.size < places.length) {
        console.warn("=== DEBUG: Places too close together ===");
        console.warn("Addresses:", addresses);
        console.warn("Streets:", streets);
        // Keep only unique street locations
        const uniquePlaces = [];
        const seenStreets = new Set();
        for (const place of places) {
          const street = place.address.split(',')[0];
          if (!seenStreets.has(street)) {
            uniquePlaces.push(place);
            seenStreets.add(street);
          }
        }
        places = uniquePlaces;
      }
    }
    
    console.log("=== DEBUG: Final validated places ===");
    console.log("Places:", places);
    console.log("Places addresses:", places.map(p => p.address));
    
    return places;
  }
  return { getLLMPlaces };
}
