import React, { useState } from "react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import PlacesCarousel from "@/components/PlacesCarousel";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface RouteSummaryStepProps {
  timeWindow: number | null;
  goals: string[];
  onContinue: () => void;
  places?: LLMPlace[];
  travelType?: string | null;
  prefs?: string[];
  scenario?: 'onsite' | 'planning';
  days?: number;
  // New backend time data
  requestedMinutes?: number;
  computedMinutes?: number;
  totalWalkingTime?: number;
  totalExploringTime?: number;
}

export default function RouteSummaryStep({
  timeWindow,
  goals,
  onContinue,
  places = [],
  travelType = null,
  prefs = [],
  scenario = 'onsite',
  days,
  requestedMinutes,
  computedMinutes,
  totalWalkingTime,
  totalExploringTime,
}: RouteSummaryStepProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  
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

  const hasGoals = Array.isArray(goals) && goals.length > 0;
  const knownCategories = new Set([
    'Restaurants','Cafés','Bars','Viewpoints','Parks','Museums','Architectural landmarks','Coworking','Bakery','Specialty coffee'
  ]);
  const basePrefs = (prefs || [])
    .map(p => (typeof p === 'string' ? p.split('→')[0].trim() : ''))
    .filter(p => p && !knownCategories.has(p) && !goals.includes(p));
  const joinSelectedPrefs = (labels: string[]) => labels.join(', ');
  const phrasePool = [
    'easy to walk',
    'calm',
    'focused on comfort and safety',
    'pleasant and relaxed',
    'low-stress and scenic'
  ];
  const combineRandomPhrases = (labels: string[]) => {
    const picks = phrasePool.slice(0).sort(() => 0.5 - Math.random()).slice(2);
    return picks.join(', ');
  };

  // Use backend time data if available, otherwise fallback to frontend calculation
  const walkMin = totalWalkingTime || 0;
  const dwellMin = totalExploringTime || 0;
  const totalMin = computedMinutes || (walkMin + dwellMin);
  const requestedMin = requestedMinutes || timeWindow || 0;

  // Convert to hours for display
  const walkH = Math.round(walkMin / 60);
  const dwellH = Math.round(dwellMin / 60);
  const totalH = Math.round(totalMin / 60);
  const requestedH = Math.round(requestedMin / 60);

  const hours = scenario === 'planning' ? 0 : requestedH;
  const minutes = scenario === 'planning' ? 0 : (requestedMin % 60);
  const formattedDuration = scenario === 'planning'
    ? (days ? `${days} day${days !== 1 ? 's' : ''}` : null)
    : (requestedMin > 0 ? `${hours}h ${minutes}min` : null);

  const travelTypePhrase = travelType ? (
    travelType === 'With family' ? 'perfect for a relaxed family day' :
    travelType === 'Business' ? 'balanced and efficient' :
    travelType === 'Couple / Romantic' ? 'cozy and romantic' :
    travelType === 'Solo' ? 'great for solo exploring' :
    travelType === 'With friends' ? 'fun with friends' : ''
  ) : '';

  const combinedPrefs = [...(goals || []), ...basePrefs];
  const prefText = combinedPrefs.join(' + ');
  const routeTone = combineRandomPhrases(basePrefs.length ? basePrefs : combinedPrefs);
  const prefClause = combinedPrefs.length > 0 ? ` — ${prefText} ` : ' ';
  const travelClause = travelTypePhrase ? ` — ${travelTypePhrase}` : '';
  const timeLabel = scenario === 'planning' ? `${days} day${(days||0) !== 1 ? 's' : ''}` : `${hours}h`;
  const totalLabel = scenario === 'planning'
    ? `${Math.max(1, Math.round(totalMin / 480))} day(s)`
    : `${totalH}h (${walkH}h walking, ${dwellH}h exploring)`;
  
  // Show requested vs computed time if they differ significantly
  const timeInfo = requestedMin > 0 && Math.abs(totalMin - requestedMin) > 30 
    ? `Requested: ${requestedH}h, Computed: ${totalH}h`
    : `Total time: ${totalLabel}`;
    
  const summary = `We've considered your preferences${prefClause}and your time (${timeLabel}). This route is ${routeTone}${travelClause}. ${timeInfo}.`;

  const subtitle = summary;

  // Group places by day for planning scenario
  const placesByDay = scenario === 'planning' && days && days > 1 
    ? places.reduce((acc, place) => {
        const day = (place as any).day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(place);
        return acc;
      }, {} as Record<number, LLMPlace[]>)
    : { 1: places };

  const availableDays = Object.keys(placesByDay).map(Number).sort((a, b) => a - b);
  const currentDayPlaces = placesByDay[selectedDay] || [];

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-6 pb-24">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold">Your route is ready 🎉</h1>
        <div className="text-lg md:text-xl text-foreground/80">{subtitle}</div>

        {/* Summary already includes time breakdown and travel type */}

        {/* Category chips hidden; categories now included inside the summary line */}

        <div className="pt-6">
          <Button
            onClick={onContinue}
            size="lg"
            className="px-8 py-6 text-lg font-semibold"
          >
            Show My Route
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {places && places.length > 0 && (
          <div className="mt-8 w-full">
            {/* Day switching buttons for planning scenario */}
            {scenario === 'planning' && availableDays.length > 1 && (
              <div className="mb-6 flex justify-center gap-2">
                {availableDays.map(day => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? "default" : "outline"}
                    onClick={() => setSelectedDay(day)}
                    className="px-4 py-2"
                  >
                    Day {day}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Places carousel for current day */}
            <PlacesCarousel places={currentDayPlaces.slice(0, 12)} />
          </div>
        )}
      </div>
    </div>
  );
}