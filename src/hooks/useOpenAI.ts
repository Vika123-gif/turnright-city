
import { useState } from "react";

export type LLMPlace = {
  name: string;
  address: string;
  walkingTime: number;
  type?: string;
  reason?: string;
};

// Inserted user-provided OpenAI API key below.
const OPENAI_API_KEY = "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 "; // <-- <<< Insert your secret OpenAI key here

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
    // Improved system prompt to strictly require a consistent JSON output
    const systemPrompt = `
You are a business travel assistant. 
Always respond with a valid, compact JSON array (no markdown, no comments, no numbering).
Each object in the array must follow this exact structure:
{
  "name": string,            // Name of the place (required)
  "address": string,         // Full address (required)
  "walkingTime": number,     // Walking time from previous stop or user's start location, in minutes (required)
  "type": string,            // Type/category, e.g. "coffee", "restaurant" (optional)
  "reason": string           // Short reason why it fits the user (optional)
}
Never return markdown formatting, don't include explanations, just output the JSON array only.

Return 1-2 realistic local businesses or locations that fit the user's criteria.
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
        temperature: 0.8,
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

