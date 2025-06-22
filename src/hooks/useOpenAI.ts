
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
    // Enhanced system prompt with stricter goal enforcement
    const systemPrompt = `
You are a business travel assistant. 
Always respond with a valid, compact JSON array (no markdown, no comments, no numbering).
Each object in the array must follow this exact structure:
{
  "name": string,            // Name of the place (required)
  "address": string,         // Full address (required)
  "walkingTime": number,     // Walking time from previous stop or user's start location, in minutes (required)
  "type": string,            // Type/category, e.g. "museum", "gallery", "cafe" (optional)
  "reason": string           // Short reason why it fits the user (optional)
}

CRITICAL: You MUST strictly follow these goal mappings. DO NOT DEVIATE:

IF user selected "explore":
- ONLY suggest: museums, art galleries, historical sites, architectural landmarks, cultural centers, monuments, parks with historical significance, libraries, observation decks, unique buildings
- ABSOLUTELY NEVER suggest: restaurants, cafes, bars, shops, or any food/drink establishments

IF user selected "eat":
- ONLY suggest: restaurants, bistros, eateries, food courts, food trucks, dining establishments
- ABSOLUTELY NEVER suggest: museums, galleries, monuments, or tourist attractions
- Focus EXCLUSIVELY on places to have meals

IF user selected "coffee":
- ONLY suggest: coffee shops, specialty cafes, roasters, tea houses
- ABSOLUTELY NEVER suggest: museums, galleries, monuments, or tourist attractions
- Focus EXCLUSIVELY on beverage establishments

IF user selected "work":
- ONLY suggest: cafes with wifi and work-friendly atmosphere, coworking spaces, business centers, quiet libraries with workspaces
- Focus on places good for laptop work

DOUBLE CHECK: Before returning your response, verify that every single place you suggest matches the user's selected goals exactly. If they selected "eat", every place must be a dining establishment. If they selected "explore", every place must be a cultural/historical attraction.

Never return markdown formatting, don't include explanations, just output the JSON array only.

Return 1-2 realistic local businesses or locations that fit the user's criteria EXACTLY.
`.trim();

    const prompt = userPrompt;
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
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 440,
      }),
    });
    if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()).slice(0, 220));
    const data = await res.json();
    const text = data.choices[0].message.content;
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
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0, 120));
    }
    if (!Array.isArray(places)) throw new Error("AI did not return a list of places.");
    return places;
  }
  return { getLLMPlaces };
}
