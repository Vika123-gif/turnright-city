
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
    console.log("Goals received in hook:", goals);
    console.log("User prompt:", userPrompt);
    console.log("Regeneration attempt:", regenerationAttempt);
    console.log("Max places:", maxPlaces);
    
    // NUCLEAR-LEVEL STRICT system prompt - ONLY REAL BUSINESSES
    const systemPrompt = `
🚨🚨🚨 MISSION CRITICAL: REAL BUSINESSES ONLY - FAKE ADDRESSES = TOTAL FAILURE 🚨🚨🚨

Location: ${location}

❌ BANNED FOREVER - DO NOT SUGGEST THESE FAKE PLACES:
- "Pastelaria Clarinha" (FAKE ADDRESS)
- "Café Milenário" (FAKE)
- "Restaurante Histórico" (FAKE)
- "Fábrica do Chocolate" (WRONG CITY)
- Any business on "Rua de Santo António 136" (FAKE STREET NUMBER)
- Any business on "Largo do Toural" unless it's a verified hotel

🚨 ABSOLUTE REQUIREMENTS (ZERO TOLERANCE):
1. You can ONLY suggest businesses that you are 100% CERTAIN exist with verified addresses
2. If you have ANY doubt about an address being real, DO NOT include it
3. Better to return 0 results than 1 fake address
4. NEVER guess street numbers or make up addresses
5. Only suggest world-famous chains OR extremely well-known local landmarks

✅ SAFE SUGGESTIONS (Examples of what you CAN suggest):
- Major hotel chains: "Hotel da Oliveira" (verified real business)
- International chains: McDonald's, Starbucks (if they exist in ${location})
- Official UNESCO sites and government monuments
- Municipal parks with official names
- Well-documented historical sites

🚨 ADDRESS VERIFICATION PROTOCOL:
- Every address must be 100% accurate and verifiable
- Include full postal codes (4xxx-xxx format for Portugal)
- Cross-check: Can someone actually find this business at this exact address?
- If uncertain about ANY part of an address, EXCLUDE that place entirely

🚨 LOCATION ENFORCEMENT:
- ALL suggestions must be in ${location}, Portugal ONLY
- Never suggest places in other cities like Vila Nova de Famalicão, Barcelos, Braga, Porto
- Triple-check city name in every address

${regenerationAttempt > 0 ? `
🔄 REGENERATION ${regenerationAttempt + 1}:
- Provide COMPLETELY different places than previous attempts
- Different neighborhoods and streets
- All verification rules still apply 1000%
` : ""}

🎯 GOALS: ${goals.join(", ")}

${goals.includes("restaurants") ? `
🍽️ RESTAURANTS: Only verified restaurants with confirmed addresses in ${location}. Examples: hotel restaurants, documented local establishments with online presence.
` : ""}

${goals.includes("coffee") ? `
☕ COFFEE: Only verified coffee shops with confirmed addresses in ${location}. Examples: hotel cafés, international chains.
` : ""}

${goals.includes("work") ? `
💻 WORK: Only verified work-friendly locations in ${location}. Examples: hotel lobbies, confirmed cafés with wifi.
` : ""}

${goals.includes("museums") ? `
🏛️ MUSEUMS: Only official museums and cultural institutions in ${location}. Examples: government-recognized museums.
` : ""}

${goals.includes("parks") ? `
🌳 PARKS: Only official parks and public gardens in ${location}. Examples: municipal parks with official names.
` : ""}

${goals.includes("monuments") ? `
🏰 MONUMENTS: Only verified historical monuments in ${location}. Examples: UNESCO sites, official heritage buildings, documented castles and palaces.
` : ""}

🚨 FINAL CHECK BEFORE SUGGESTING ANY PLACE:
✓ Is this business name real and verified?
✓ Is this exact address 100% accurate?
✓ Can I guarantee someone will find this business here?
✓ Is this actually in ${location} and not another city?
✓ Am I certain this isn't a fake or made-up establishment?

If ANY answer is uncertain, REMOVE that place immediately.

RETURN EXACTLY ${maxPlaces} VERIFIED REAL PLACES or fewer if you cannot find enough verified options.

OUTPUT FORMAT - JSON ONLY:
[
  {
    "name": "VERIFIED real business name",
    "address": "100% accurate address with postal code, ${location}, Portugal", 
    "walkingTime": minutes,
    "type": "category",
    "reason": "why it matches goals"
  }
]

NO markdown, NO explanations, ONLY JSON with REAL verified businesses.
`.trim();

    console.log("=== DEBUG: Nuclear-level strict system prompt ===");
    
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
        temperature: 0.0, // Zero creativity - facts only
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
    
    // NUCLEAR-LEVEL CLIENT-SIDE VALIDATION
    const locationName = location.toLowerCase();
    
    // Expanded list of forbidden fake businesses
    const forbiddenNames = [
      'pastelaria clarinha',
      'restaurante histórico',
      'café milenário', 
      'fábrica do chocolate',
      'restaurante tradicional',
      'café central',
      'pastelaria regional',
      'taberna do trovador',
      'casa do bacalhau',
      'adega regional'
    ];
    
    // Forbidden fake addresses/streets
    const forbiddenAddresses = [
      'rua de santo antónio 136',
      'rua de santo antónio 113',
      'rua de paio galvão 12',
      'largo do toural' // unless it's a hotel
    ];
    
    // Wrong cities that AI sometimes suggests
    const wrongCities = [
      'vila nova de famalicão',
      'famalicão', 
      'barcelos', 
      'braga', 
      'porto',
      'viana do castelo'
    ];
    
    const validPlaces = places.filter(place => {
      const placeName = place.name?.toLowerCase() || '';
      const address = place.address?.toLowerCase() || '';
      
      // Check for forbidden fake names
      const hasForbiddenName = forbiddenNames.some(forbidden => placeName.includes(forbidden));
      if (hasForbiddenName) {
        console.error("REJECTED: Forbidden fake name detected:", place.name);
        return false;
      }
      
      // Check for forbidden fake addresses
      const hasForbiddenAddress = forbiddenAddresses.some(forbidden => {
        if (forbidden === 'largo do toural') {
          // Allow Largo do Toural only for hotels
          return address.includes(forbidden) && !placeName.includes('hotel') && !placeName.includes('pousada');
        }
        return address.includes(forbidden);
      });
      if (hasForbiddenAddress) {
        console.error("REJECTED: Forbidden fake address detected:", place.address);
        return false;
      }
      
      // Check location requirements
      const hasCorrectLocation = address.includes(locationName);
      if (!hasCorrectLocation) {
        console.error("REJECTED: Wrong location, expected", locationName, "in address:", place.address);
        return false;
      }
      
      // Check for wrong cities
      const hasWrongCity = wrongCities.some(city => address.includes(city));
      if (hasWrongCity) {
        console.error("REJECTED: Wrong city detected in address:", place.address);
        return false;
      }
      
      // Additional validation for suspicious patterns
      if (address.includes('rua de santo antónio') && !address.includes('hotel')) {
        console.error("REJECTED: Suspicious Santo António street without hotel:", place.address);
        return false;
      }
      
      return true;
    });
    
    if (validPlaces.length === 0) {
      console.error("=== ALL PLACES REJECTED ===");
      console.error("Original places:", places);
      throw new Error(`All suggested places were invalid or fake. The AI is still generating incorrect addresses for ${location}. Please try regenerating or selecting different goals.`);
    }
    
    // Geographic distribution validation - ensure places are not too close
    if (validPlaces.length > 1) {
      const uniquePlaces = [];
      const seenStreets = new Set();
      
      for (const place of validPlaces) {
        const street = place.address.split(',')[0].toLowerCase();
        if (!seenStreets.has(street)) {
          uniquePlaces.push(place);
          seenStreets.add(street);
        } else {
          console.warn("FILTERED: Duplicate street detected:", street);
        }
      }
      
      places = uniquePlaces;
    } else {
      places = validPlaces;
    }
    
    console.log("=== DEBUG: Final validated places ===");
    console.log("Places:", places);
    console.log("Places count:", places.length);
    
    return places;
  }
  return { getLLMPlaces };
}
