import React, { useState } from "react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import PlacesCarousel from "@/components/PlacesCarousel";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";

interface RouteSummaryStepProps {
  timeWindow: number | null;
  goals: string[];
  onContinue: () => void;
  onRegenerate?: () => void;
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
  onRegenerate,
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
  
  // Extract preference labels from settings (e.g., "Mobility-friendly" from "Mobility-friendly → Easy routes...")
  const basePrefs = (prefs || [])
    .map(p => (typeof p === 'string' ? p.split('→')[0].trim() : ''))
    .filter(p => p && !knownCategories.has(p) && !goals.includes(p));

  // Use backend time data if available, otherwise fallback to frontend calculation
  const walkMin = totalWalkingTime || 0;
  const dwellMin = totalExploringTime || 0;
  const totalMin = computedMinutes || (walkMin + dwellMin);
  const requestedMin = requestedMinutes || timeWindow || 0;
  
  // Debug logging for summary step
  console.log("=== ROUTE SUMMARY TIME DEBUG ===");
  console.log("totalWalkingTime prop:", totalWalkingTime);
  console.log("totalExploringTime prop:", totalExploringTime);
  console.log("computed walkMin:", walkMin);
  console.log("computed dwellMin:", dwellMin);
  console.log("Places count:", places.length);
  console.log("Places walking times:", places.map(p => `${p.name}: ${p.walkingTime}min`));
  console.log("=================================");

  // Helper function to format time (show minutes if < 60, otherwise hours and minutes)
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formattedDuration = scenario === 'planning'
    ? (days ? `${days} day${days !== 1 ? 's' : ''}` : null)
    : (requestedMin > 0 ? formatTime(requestedMin) : null);

  const travelTypePhrase = travelType ? (
    travelType === 'With family' ? 'family-friendly' :
    travelType === 'Business' ? 'efficient' :
    travelType === 'Couple / Romantic' ? 'romantic' :
    travelType === 'Solo' ? 'solo adventure' :
    travelType === 'With friends' ? 'fun with friends' : ''
  ) : '';

  const timeLabel = scenario === 'planning' 
    ? `${days} day${(days||0) !== 1 ? 's' : ''}` 
    : formatTime(requestedMin);
  const totalLabel = scenario === 'planning'
    ? `${Math.max(1, Math.round(totalMin / 480))} day(s)`
    : `${formatTime(totalMin)} (${formatTime(walkMin)} walk, ${formatTime(dwellMin)} explore)`;
  
  // Build personalized summary
  const goalsList = goals.slice(0, 3).join(', '); // Show max 3 goals
  const hasMoreGoals = goals.length > 3;
  const goalsText = hasMoreGoals ? `${goalsList} & more` : goalsList;
  
  const prefsText = basePrefs.length > 0 ? ` We made sure it's ${basePrefs.join(' and ').toLowerCase()}.` : '';
  const travelText = travelTypePhrase ? `, ${travelTypePhrase}` : '';
  
  const summary = `Your personalized ${timeLabel} route for ${goalsText}${travelText}.${prefsText} Total: ${totalLabel}.`;

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

  const availableDays = Object.keys(placesByDay)
    .map(n => Number(n))
    .sort((a, b) => a - b);

  const safeSelected = availableDays.includes(selectedDay) ? selectedDay : availableDays[0] ?? 1;
  const currentDayPlaces = placesByDay[safeSelected] || [];

  return (
    <div
      className="
        flex flex-col items-center text-center
        px-4 pt-2
        pb-[calc(env(safe-area-inset-bottom,0px)+6rem)]
        h-[100dvh]
        w-full
        justify-start md:justify-center
        overflow-y-auto
      "
    >
      <div className="max-w-2xl w-full space-y-6 pb-16">
        <h1 className="text-3xl md:text-4xl font-bold">Your route is ready 🎉</h1>
        <div className="text-lg md:text-xl text-foreground/80">{subtitle}</div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={onContinue}
            size="lg"
            className="px-8 py-6 text-lg font-semibold"
          >
            Show My Route
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          {onRegenerate && (
            <Button
              onClick={onRegenerate}
              variant="outline"
              size="lg"
              className="px-8 py-6 text-lg font-semibold border-2"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Places Preview Section - Moved outside for better visibility */}
      {places && places.length > 0 && (
        <div className="w-full max-w-6xl px-4 mt-4 pb-8 overflow-y-visible">
          {/* Day switching buttons for planning scenario */}
          {scenario === 'planning' && availableDays.length > 1 && (
            <div className="mb-6 flex justify-center gap-2">
              {availableDays.map(day => (
                <Button
                  key={day}
                  variant={safeSelected === day ? "default" : "outline"}
                  onClick={() => setSelectedDay(day)}
                  className="px-4 py-2"
                >
                  Day {day}
                </Button>
              ))}
            </div>
          )}
          
          {/* Places carousel for current day - wrapped with max-height for mobile safety */}
          <div className="max-h-[calc(100dvh-16rem)] overflow-y-auto overscroll-contain">
            <PlacesCarousel places={currentDayPlaces.slice(0, 12)} />
          </div>
        </div>
      )}
    </div>
  );
}