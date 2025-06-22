
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
  }: {
    location: string;
    goals: string[];
    timeWindow: string;
    userPrompt: string;
  }): Promise<LLMPlace[]> {
    
    console.log("=== DEBUG: useOpenAI getLLMPlaces called ===");
    console.log("Goals received in hook:", goals);
    console.log("Goals type:", typeof goals);
    console.log("Goals is array:", Array.isArray(goals));
    console.log("Goals length:", goals?.length);
    console.log("User prompt:", userPrompt);
    
    // Remove the validation here since it's already done in ChatFlow
    // The error message "Please select at least one goal before generating places" 
    // should only come from ChatFlow validation, not here
    
    // Enhanced system prompt with stricter goal enforcement
    const systemPrompt = `
You are a business travel assistant that MUST follow goal restrictions EXACTLY. 
Always respond with a valid, compact JSON array (no markdown, no comments, no numbering).
Each object in the array must follow this exact structure:
{
  "name": string,            // Name of the place (required)
  "address": string,         // Full address (required)
  "walkingTime": number,     // Walking time from previous stop or user's start location, in minutes (required)
  "type": string,            // Type/category, e.g. "museum", "gallery", "cafe" (optional)
  "reason": string           // Short reason why it fits the user (optional)
}

CRITICAL GOAL ENFORCEMENT - READ CAREFULLY AND FOLLOW EXACTLY:

User's selected goals: ${goals.join(", ")}

${goals.includes("eat") ? `
GOAL: EAT - The user wants to EAT
- ONLY suggest: restaurants, bistros, eateries, food courts, food trucks, dining establishments, places to have meals
- ABSOLUTELY NEVER suggest: museums, galleries, monuments, tourist attractions, coffee shops, or any non-dining establishments
- Every single suggestion MUST be a place where people go to eat meals
` : ""}

${goals.includes("coffee") ? `
GOAL: COFFEE - The user wants COFFEE/BEVERAGES  
- ONLY suggest: coffee shops, specialty cafes, roasters, tea houses, beverage establishments
- ABSOLUTELY NEVER suggest: museums, galleries, monuments, tourist attractions, restaurants for meals
- Every single suggestion MUST be a place where people go for coffee, tea, or other beverages
` : ""}

${goals.includes("explore") ? `
GOAL: EXPLORE - The user wants to EXPLORE CULTURE
- ONLY suggest: museums, art galleries, historical sites, architectural landmarks, cultural centers, monuments, parks with historical significance, libraries, observation decks, unique buildings
- ABSOLUTELY NEVER suggest: restaurants, cafes, bars, shops, or any food/drink establishments
- Every single suggestion MUST be a cultural or historical attraction
` : ""}

${goals.includes("work") ? `
GOAL: WORK - The user wants to WORK
- ONLY suggest: cafes with wifi and work-friendly atmosphere, coworking spaces, business centers, quiet libraries with workspaces
- Focus on places good for laptop work
- ABSOLUTELY NEVER suggest: tourist attractions, regular restaurants without work facilities
` : ""}

VERIFICATION STEP: Before returning your response, check each suggestion:
- Does it match the user's selected goals EXACTLY?
- If the user selected "eat", is every suggestion a dining establishment?
- If the user selected "explore", is every suggestion a cultural attraction?
- If the user selected "coffee", is every suggestion a beverage establishment?

If ANY suggestion doesn't match the goals perfectly, DO NOT include it.

Never return markdown formatting, don't include explanations, just output the JSON array only.
Return 1-2 realistic local businesses or locations that fit the user's criteria EXACTLY.
`.trim();

    console.log("=== DEBUG: System prompt ===");
    console.log("System prompt includes goals:", goals);
    
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
        temperature: 0.1, // Even lower temperature for maximum consistency
        max_tokens: 440,
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
    
    console.log("=== DEBUG: Parsed places ===");
    console.log("Places:", places);
    
    return places;
  }
  return { getLLMPlaces };
}
