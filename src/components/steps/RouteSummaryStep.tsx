import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface RouteSummaryStepProps {
  timeWindow: number | null;
  goals: string[];
  onContinue: () => void;
}

export default function RouteSummaryStep({
  timeWindow,
  goals,
  onContinue,
}: RouteSummaryStepProps) {
  const goalEmojis: Record<string, string> = {
    restaurants: '🍽️',
    coffee: '☕',
    work: '💼',
    museums: '🏛️',
    parks: '🌳',
    monuments: '🏰'
  };
  
  const goalLabels: Record<string, string> = {
    restaurants: 'Restaurants',
    coffee: 'Coffee & Cafes',
    work: 'Work Spaces',
    museums: 'Museums',
    parks: 'Parks',
    monuments: 'Monuments'
  };

  const timeInHours = timeWindow ? (timeWindow / 60).toFixed(1) : "0";

  const interestsText = goals
    .map((goal) => `${goalEmojis[goal] || '📍'}${goalLabels[goal] || goal}`)
    .join(" + ");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <div className="max-w-2xl w-full space-y-6 text-center">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
            Your perfect {timeInHours}-hour loop is ready!
          </h1>
          
          <div className="text-lg md:text-xl text-foreground/80 py-4">
            {interestsText} = A day to remember.
          </div>

          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-full text-base md:text-lg font-medium">
            ⏱️ Total time: {timeInHours} h (including walks and breaks)
          </div>
        </div>

        <div className="pt-8">
          <Button
            onClick={onContinue}
            size="lg"
            className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity shadow-lg"
          >
            Let's Go
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
