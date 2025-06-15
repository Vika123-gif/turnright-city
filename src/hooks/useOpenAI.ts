
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
      // Compose prompt
      const prompt = `You are a friendly AI concierge for business trips. User is located at ${options.location}, has ${options.time_window} available. They want to: ${options.goals.join(", ")}. Suggest 2-3 nearby places that will help them do everything they want. Include:
- Place name
- What they can do there
- Travel time
- Why it's good right now.
Make the response clear, concise and slightly inspiring.`;

      // Call OpenAI API (GPT-3.5-turbo is sufficient for generation)
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
            { role: "user", content: prompt }
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
