
import { useState } from "react";

export type LLMPlace = {
  name: string;
  address: string;
  walkingTime: number;
  type?: string;
  reason?: string;
};

export function useOpenAI() {
  // Simpler hook: only calls API, leaves prompt to consumer
  async function getLLMPlaces({
    apiKey,
    location,
    goals,
    timeWindow,
    userPrompt,
  }: {
    apiKey: string;
    location: string;
    goals: string[];
    timeWindow: string;
    userPrompt: string;
  }): Promise<LLMPlace[]> {
    const prompt = userPrompt;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You generate creative, realistic local business route suggestions for business travelers in JSON format.",
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
      const match = text.match(/\[.*?\]/s);
      if (match) places = JSON.parse(match[0]);
      else places = JSON.parse(text);
    } catch {
      throw new Error("AI could not generate a valid route.\n\n" + text?.slice(0,120));
    }
    if (!Array.isArray(places)) throw new Error("AI did not return a list of places.");
    return places;
  }
  return { getLLMPlaces };
}
