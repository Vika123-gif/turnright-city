
import { useState } from "react";

export const useOpenAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateRoute(options: {
    location: string;
    time_window: string;
    goals: string[];
    apiKey: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      // Use improved activity- and time-aware prompt
      const activityPrompt = `
You are a business travel assistant for walking-only recommendations. User has ${options.time_window} and wants to: ${options.goals.join(", ")}. User location: ${options.location}.

ACTIVITY-BASED TIME LOGIC:

IF goals include "Explore something new":
- 30 minutes: 2-3 quick stops, 5-7 minutes each, walking route
- 1 hour: 3-4 places OR 1-2 places with more time, walking route  
- 1.5 hours: 4-5 places with comfortable exploration
- 2+ hours: Full walking tour with 5-6 interesting stops

IF goals include "Drink coffee" OR "Eat":
- 30 minutes: 1 place only, 5-min walk + 20-min sitting + 5-min return
- 1 hour: 1 place only, 5-min walk + 50-min sitting + 5-min return
- 1.5+ hours: 1-2 places maximum with sitting time

IF goals include "Work":
- 30 minutes: 1 place only, 5-min walk + 20-min work + 5-min return
- 1 hour: 1 place only, 5-min walk + 50-min work + 5-min return  
- 1.5+ hours: 1 place with extended work time

WALKING RULES:
- Never suggest places more than 10 minutes walk away
- All movement is on foot only
- Account for walking time between multiple stops
- Always calculate: total walking time + activity time = must fit in ${options.time_window}

RESPONSE FORMAT:
**Perfect for your ${options.time_window} to ${options.goals.join(", ")}:**

[For single location:]
**[Place Name]**
📍 [X-minute walk from your location]  
⏱️ [How much time you'll spend there]
🎯 Perfect because: [why it matches their goals and time]
💡 Tip: [one practical suggestion]

[For multiple locations - exploration only:]
**Walking Route ([X] stops):**
1. **[Place 1]** - [X min walk] - [what to see/do]
2. **[Place 2]** - [X min walk from Place 1] - [what to see/do]  
3. **[Place 3]** - [X min walk from Place 2] - [what to see/do]

⏱️ Total time: [X min walking + X min exploring = fits in ${options.time_window}]
🎯 This route gives you: [summary of experience]
`;

      // Call OpenAI API using the custom prompt
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a friendly AI concierge for business trips." },
            { role: "user", content: activityPrompt }
          ],
          temperature: 0.9,
          max_tokens: 400,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI Error: ${errText}`);
      }
      const data = await res.json();
      return data.choices[0].message.content as string;
    } catch (err: any) {
      setError(err.message || "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { generateRoute, loading, error };
};
