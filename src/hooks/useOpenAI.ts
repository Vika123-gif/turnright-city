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
    
    // ULTRA-STRICT system prompt with ZERO TOLERANCE for fake addresses
    const systemPrompt = `
You are a business travel assistant. You MUST follow these rules with ABSOLUTE PRECISION:

🚨 CRITICAL LOCATION REQUIREMENT:
User's location: ${location}

🚨 ZERO TOLERANCE ADDRESS POLICY - THIS IS ABSOLUTELY CRITICAL:
- You MUST ONLY suggest businesses that you are 100% CERTAIN exist in real life
- You MUST ONLY use addresses that you KNOW are completely accurate
- NEVER guess addresses, NEVER make up street numbers
- NEVER suggest generic locations like "Largo do Toural" without a specific business
- If you are not 100% certain about an address, DO NOT include that place
- Better to return ZERO results than ONE fake address
- Each address must be for a REAL, OPERATING business that actually exists at that exact location

🚨 BUSINESS VERIFICATION REQUIREMENTS:
- ONLY suggest well-known, established businesses (cafés, restaurants, etc.)
- ONLY use businesses you can verify actually exist in ${location}
- Examples of what to look for: chain stores, famous local establishments, businesses with multiple online reviews
- NEVER create fictional business names
- NEVER suggest places that might exist but you're not certain about

🚨 LOCATION ENFORCEMENT - ABSOLUTELY NO EXCEPTIONS:
- If user says "Guimarães" - ALL places MUST be in Guimarães, Portugal
- NEVER suggest places in other cities like Vila Nova de Famalicão, Barcelos, Braga, Porto
- Double-check: Does this address actually contain "${location}"?
- Triple-check: Is this business actually located in ${location} and not somewhere else?

🚨 GEOGRAPHIC DISTRIBUTION:
- Places MUST be in DIFFERENT neighborhoods of ${location}
- NEVER suggest places on the same street
- Ensure significant walking distance between suggestions (200+ meters minimum)

🚨 QUANTITY REQUIREMENT:
- You MUST return EXACTLY ${maxPlaces} place${maxPlaces > 1 ? 's' : ''}
- If you cannot find ${maxPlaces} places with 100% verified addresses, return fewer
- NEVER return more than ${maxPlaces}

${regenerationAttempt > 0 ? `
🔄 REGENERATION - ATTEMPT ${regenerationAttempt + 1}:
- Provide COMPLETELY DIFFERENT places than previous attempts
- Use DIFFERENT streets and neighborhoods
- All verification rules still apply 100%
` : ""}

GOAL ENFORCEMENT:
User's selected goals: ${goals.join(", ")}

${goals.includes("eat") ? `
🍽️ EATING GOAL:
- ONLY suggest verified restaurants, bistros, eateries in ${location}
- NEVER suggest coffee shops, museums, or attractions
- Every suggestion must be a real place for meals
` : ""}

${goals.includes("coffee") ? `
☕ COFFEE GOAL:
- ONLY suggest verified coffee shops, cafés in ${location}
- NEVER suggest restaurants for meals, museums, or attractions
- Every suggestion must be a real coffee/beverage establishment
` : ""}

${goals.includes("explore") ? `
🏛️ EXPLORATION GOAL:
- ONLY suggest verified museums, galleries, historical sites in ${location}
- NEVER suggest restaurants, cafes, or commercial establishments
- Every suggestion must be a real cultural attraction
` : ""}

${goals.includes("work") ? `
💻 WORK GOAL:
- ONLY suggest verified work-friendly cafés, coworking spaces in ${location}
- Focus on places with wifi and laptop-friendly environment
- NEVER suggest tourist attractions or regular restaurants
` : ""}

🚨 FINAL VERIFICATION CHECKLIST - CHECK EVERY SUGGESTION:
Before including ANY place, verify:
✓ Does this exact business name exist in real life?
✓ Is this exact address 100% accurate and verified?
✓ Is this business actually located in ${location}?
✓ Am I absolutely certain this is not a made-up address?
✓ Does this match the user's goals exactly?
✓ Are places in different areas of ${location}?

If ANY answer is NO or UNCERTAIN, REMOVE that suggestion immediately.

OUTPUT FORMAT - RETURN ONLY JSON:
[
  {
    "name": "Exact real business name",
    "address": "100% verified real address, ${location}, Portugal",
    "walkingTime": number_in_minutes,
    "type": "category",
    "reason": "why it matches user goals"
  }
]

REMEMBER: Quality over quantity. Better to return fewer results than ANY fake addresses.
NO markdown, NO explanations, ONLY the JSON array.
`.trim();

    console.log("=== DEBUG: Ultra-strict system prompt ===");
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
        temperature: regenerationAttempt > 0 ? 0.7 : 0.01, // Ultra-low temperature for accuracy
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
    
    // Enhanced client-side validation
    const locationName = location.toLowerCase();
    const invalidPlaces = places.filter(place => {
      const address = place.address?.toLowerCase() || '';
      const hasLocation = address.includes(locationName);
      
      // Additional check for common wrong cities near Guimarães
      const wrongCities = ['famalicão', 'barcelos', 'braga', 'porto'];
      const hasWrongCity = wrongCities.some(city => address.includes(city));
      
      return !hasLocation || hasWrongCity;
    });
    
    if (invalidPlaces.length > 0) {
      console.error("=== DEBUG: Invalid locations detected ===");
      console.error("Expected location:", location);
      console.error("Invalid places:", invalidPlaces);
      
      // Filter out invalid places
      places = places.filter(place => {
        const address = place.address?.toLowerCase() || '';
        const hasLocation = address.includes(locationName);
        const wrongCities = ['famalicão', 'barcelos', 'braga', 'porto'];
        const hasWrongCity = wrongCities.some(city => address.includes(city));
        return hasLocation && !hasWrongCity;
      });
      
      if (places.length === 0) {
        throw new Error(`No valid places found in ${location}. The AI suggested places in other cities. Please try again.`);
      }
    }
    
    // Additional validation for address accuracy
    const suspiciousAddresses = places.filter(place => {
      const address = place.address || '';
      // Check for generic addresses that are likely fake
      return address.includes('Largo do Toural') && !address.includes('Hotel') && !address.includes('Restaurante') && !address.includes('Café');
    });
    
    if (suspiciousAddresses.length > 0) {
      console.warn("=== DEBUG: Suspicious generic addresses detected ===");
      console.warn("Suspicious places:", suspiciousAddresses);
      // Remove suspicious generic addresses
      places = places.filter(place => {
        const address = place.address || '';
        return !(address.includes('Largo do Toural') && !address.includes('Hotel') && !address.includes('Restaurante') && !address.includes('Café'));
      });
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
