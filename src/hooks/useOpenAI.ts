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
    
    // Enhanced system prompt with ABSOLUTE location enforcement and 100% accurate addresses
    const systemPrompt = `
You are a business travel assistant. You MUST follow these rules EXACTLY:

ABSOLUTE LOCATION REQUIREMENT - THIS IS CRITICAL:
User's location: ${location}

🚨 LOCATION ENFORCEMENT RULES - FOLLOW EXACTLY:
- If user says "Guimarães" or is in Guimarães, ALL places MUST be in Guimarães, Portugal
- NEVER suggest places in Vila Nova de Famalicão, Barcelos, Braga, Porto, or ANY other city
- Check each address carefully - it MUST contain "Guimarães" 
- If you're not 100% certain a place is in ${location}, DO NOT include it
- Better to return fewer results than wrong locations

🚨 ADDRESS ACCURACY RULES - ABSOLUTELY CRITICAL - 100% ACCURACY REQUIRED:
- You MUST provide ONLY real, verified, existing addresses
- NEVER make up addresses or business names
- NEVER provide generic addresses like "Largo do Toural" without specific business names
- NEVER invent restaurants, cafes, or businesses that don't exist
- Use ONLY established, well-known businesses that you are 100% certain exist
- Format: "Actual Business Name, Exact Street Address with Number, ${location}, Portugal"
- If you don't know the exact address of a real business, DO NOT include it
- Better to return fewer results than provide fake addresses
- Each address must be for a real, operating business that actually exists

🚨 BUSINESS VERIFICATION RULES - CRITICAL:
- Only suggest businesses you are absolutely certain exist
- Use well-known establishments, chains, or famous local businesses
- NEVER create fictional restaurant names or business names
- If unsure about a business's existence, exclude it entirely
- Each business name must be real and verifiable

🚨 GEOGRAPHIC DISTRIBUTION RULES - CRITICAL:
- Places MUST be in DIFFERENT areas of ${location}
- NEVER suggest places on the same street or with similar addresses
- Ensure at least 200+ meters walking distance between suggestions
- Look for places in different neighborhoods/districts of ${location}
- Vary the street names and areas significantly

🚨 QUANTITY REQUIREMENT - CRITICAL:
- You MUST return EXACTLY ${maxPlaces} place${maxPlaces > 1 ? 's' : ''}
- Do NOT return more or fewer than ${maxPlaces}
- If you cannot find ${maxPlaces} suitable places with 100% accurate addresses, return fewer but NEVER more

${regenerationAttempt > 0 ? `
🔄 REGENERATION RULES - THIS IS ATTEMPT ${regenerationAttempt + 1}:
- You MUST provide COMPLETELY DIFFERENT places than previous attempts
- Use DIFFERENT streets, DIFFERENT neighborhoods
- Vary the types of establishments significantly
- Think of alternative areas in ${location}
- Be creative with different districts and areas
- ALL addresses must still be 100% accurate and real
` : ""}

GOAL ENFORCEMENT:
User's selected goals: ${goals.join(", ")}

${goals.includes("eat") ? `
GOAL: EAT - The user wants to EAT
- ONLY suggest: real restaurants, bistros, eateries that actually exist
- ABSOLUTELY NEVER suggest: museums, galleries, monuments, tourist attractions, coffee shops
- Every suggestion MUST be a real place where people go to eat meals
- ALL places MUST be in ${location} with 100% accurate addresses
- ENSURE places are in DIFFERENT neighborhoods of ${location}
- Use only well-known, established restaurants that you're certain exist
` : ""}

${goals.includes("coffee") ? `
GOAL: COFFEE - The user wants COFFEE/BEVERAGES  
- ONLY suggest: real coffee shops, specialty cafes, roasters that actually exist
- ABSOLUTELY NEVER suggest: museums, galleries, monuments, tourist attractions, restaurants for meals
- Every suggestion MUST be for real coffee, tea, or beverage establishments
- ALL places MUST be in ${location} with 100% accurate addresses
- ENSURE places are in DIFFERENT areas of ${location}
- Use only well-known, established coffee shops that you're certain exist
` : ""}

${goals.includes("explore") ? `
GOAL: EXPLORE - The user wants to EXPLORE CULTURE
- ONLY suggest: real museums, art galleries, historical sites, architectural landmarks that actually exist
- ABSOLUTELY NEVER suggest: restaurants, cafes, bars, shops, or any food/drink establishments
- Every suggestion MUST be a real cultural or historical attraction
- ALL places MUST be in ${location} with 100% accurate addresses
- ENSURE places are in DIFFERENT parts of ${location}
- Use only well-known, established cultural sites that you're certain exist
` : ""}

${goals.includes("work") ? `
GOAL: WORK - The user wants to WORK
- ONLY suggest: real cafes with wifi, coworking spaces, business centers that actually exist
- Focus on real places good for laptop work
- ABSOLUTELY NEVER suggest: tourist attractions, regular restaurants without work facilities
- ALL places MUST be in ${location} with 100% accurate addresses
- ENSURE places are in DIFFERENT areas of ${location}
- Use only well-known, established work-friendly spaces that you're certain exist
` : ""}

OUTPUT FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "Real business name that actually exists",
    "address": "100% accurate real address with street number, ${location}, Portugal",
    "walkingTime": number_in_minutes,
    "type": "category",
    "reason": "why it fits the user"
  }
]

FINAL VERIFICATION CHECKLIST - ABSOLUTELY CRITICAL:
Before responding, verify EACH suggestion:
✓ Does this business actually exist in real life?
✓ Is the address 100% accurate and real?
✓ Does the address contain "${location}"?
✓ Is this place actually located in ${location} and not another city?
✓ Does it match the user's goals exactly?
✓ Are the places in DIFFERENT neighborhoods/streets?
✓ Is there good geographic distribution?
✓ Am I 100% certain this business exists?
✓ Do I have EXACTLY ${maxPlaces} place${maxPlaces > 1 ? 's' : ''}?
✓ If ANY answer is NO, remove that suggestion immediately

NEVER provide fictional addresses or business names. ONLY real, existing businesses with verified addresses.
Return EXACTLY ${maxPlaces} place${maxPlaces > 1 ? 's' : ''} maximum. Quality and accuracy over quantity.
NO markdown, NO explanations, ONLY the JSON array.
`.trim();

    console.log("=== DEBUG: Enhanced system prompt ===");
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
        temperature: regenerationAttempt > 0 ? 0.7 : 0.05, // Higher temperature for regeneration
        max_tokens: 440 + (maxPlaces * 50), // Adjust tokens based on number of places
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
    
    // Additional client-side validation to catch location errors
    const locationName = location.toLowerCase();
    const invalidPlaces = places.filter(place => {
      const address = place.address?.toLowerCase() || '';
      return !address.includes(locationName);
    });
    
    if (invalidPlaces.length > 0) {
      console.error("=== DEBUG: Invalid locations detected ===");
      console.error("Expected location:", location);
      console.error("Invalid places:", invalidPlaces);
      
      // Filter out invalid places
      places = places.filter(place => {
        const address = place.address?.toLowerCase() || '';
        return address.includes(locationName);
      });
      
      if (places.length === 0) {
        throw new Error(`No valid places found in ${location}. The AI suggested places in other cities. Please try again.`);
      }
    }
    
    // Additional validation for geographic distribution
    if (places.length > 1) {
      const addresses = places.map(p => p.address);
      const streets = addresses.map(addr => addr.split(',')[0]); // Get street part
      const uniqueStreets = new Set(streets);
      
      if (uniqueStreets.size < places.length) {
        console.warn("=== DEBUG: Places too close together ===");
        console.warn("Addresses:", addresses);
        console.warn("Streets:", streets);
        // Keep only the first place if they're too close
        places = places.slice(0, 1);
      }
    }
    
    console.log("=== DEBUG: Final validated places ===");
    console.log("Places:", places);
    console.log("Places addresses:", places.map(p => p.address));
    
    return places;
  }
  return { getLLMPlaces };
}
