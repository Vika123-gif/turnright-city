
import React, { useState } from "react";
import Button from "../Button";
import { Repeat, MapPin, Clock, ChevronLeft, ChevronRight, Download, Save, Check, MoreVertical, ExternalLink } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { supabase } from "@/integrations/supabase/client";
import { useDatabase } from "@/hooks/useDatabase";
import Map from "../Map";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  places: LLMPlace[];
  onRegenerate: () => void;
  onBuy: () => void;
  purchasing: boolean;
  error?: string | null;
  location?: string;
  onTrackBuyClick?: (location: string, placesCount: number) => void;
  days?: number; // Number of days for the trip
  scenario?: "onsite" | "planning"; // Add scenario prop
  userSessionId?: string; // Add user session ID for saving
  goals?: string[]; // Add goals for saving
};

const RoutePreviewStep: React.FC<Props> = ({
  places,
  onRegenerate,
  onBuy,
  purchasing,
  error,
  location = '',
  onTrackBuyClick,
  days = 1,
  scenario = "onsite",
  userSessionId = '',
  goals = [],
}) => {
  const [processing, setProcessing] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const { saveUserRoute } = useDatabase();

  // Open specific day route in Google Maps
  function handleOpenDayInGoogleMaps(dayPlaces: LLMPlace[]) {
    if (!dayPlaces || dayPlaces.length === 0) return;
    
    // Build waypoints from day places with coordinates
    const waypoints = dayPlaces
      .filter(place => place.lat && place.lon)
      .map(place => `${place.lat},${place.lon}`)
      .join('/');
    
    if (waypoints) {
      const googleMapsUrl = `https://www.google.com/maps/dir/${waypoints}`;
      window.open(googleMapsUrl, '_blank');
    }
  }

  // Handle route save
  const handleSaveRoute = async () => {
    if (!userSessionId || places.length === 0) {
      console.error('Cannot save route: missing user session or places');
      return;
    }

    setSaving(true);
    try {
      // Generate a route name based on location and current date
      const routeName = `${location} ${scenario === 'planning' ? 'Trip' : 'Route'} - ${new Date().toLocaleDateString()}`;
      
      // Calculate total walking time from places (use walkingTime property)
      const totalWalkingTime = places.reduce((total, place) => {
        return total + (place.walkingTime || 0);
      }, 0);

      // Build Google Maps URL for the route
      const waypoints = places
        .filter(place => place.lat && place.lon)
        .map(place => `${place.lat},${place.lon}`)
        .join('/');
      const mapUrl = waypoints ? `https://www.google.com/maps/dir/${waypoints}` : null;

      const savedRoute = await saveUserRoute(
        routeName,
        location,
        scenario,
        days,
        goals,
        places,
        totalWalkingTime,
        mapUrl,
        userSessionId
      );

      if (savedRoute) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000); // Reset after 3 seconds
        console.log('Route saved successfully!');
      } else {
        console.error('Failed to save route');
      }
    } catch (error) {
      console.error('Error saving route:', error);
    } finally {
      setSaving(false);
    }
  };

  // Group places by days (for planning scenario)
  const groupPlacesByDays = () => {
    if (scenario === "onsite") {
      // For onsite, treat all places as one "day"
      return [{ day: 1, places: places }];
    }
    
    // For planning scenario, group by actual days
    const placesPerDay = 6; // Always 6 places per day for planning
    const groupedPlaces = [];
    
    console.log('=== GROUPING DEBUG ===');
    console.log('Total places:', places.length);
    console.log('Days:', days);
    console.log('Places per day:', placesPerDay);
    console.log('Should have:', days * placesPerDay, 'places total');
    
    // If we don't have enough places, we'll work with what we have
    // and distribute them across days as evenly as possible
    let allPlaces = [...places];
    
    for (let day = 0; day < days; day++) {
      const startIndex = day * placesPerDay;
      let dayPlaces;
      
      if (startIndex >= allPlaces.length) {
        // If we've run out of places, cycle back to the beginning
        // but try to avoid exact duplicates by shuffling slightly
        const remainingPlaces = [...places].slice((day % places.length));
        dayPlaces = remainingPlaces.slice(0, placesPerDay);
      } else {
        const endIndex = Math.min(startIndex + placesPerDay, allPlaces.length);
        dayPlaces = allPlaces.slice(startIndex, endIndex);
        
        // If we don't have enough places for this day, add from the beginning
        while (dayPlaces.length < placesPerDay && places.length > 0) {
          const additionalPlace = places[dayPlaces.length % places.length];
          if (!dayPlaces.find(p => p.name === additionalPlace.name)) {
            dayPlaces.push(additionalPlace);
          } else {
            // If all places are already used, stop adding
            break;
          }
        }
      }
      
      console.log(`Day ${day + 1}: got ${dayPlaces.length} places`);
      
      if (dayPlaces.length > 0) {
        groupedPlaces.push({
          day: day + 1,
          places: dayPlaces
        });
      }
    }
    
    console.log('Grouped places result:', groupedPlaces);
    return groupedPlaces;
  };

  const groupedPlaces = groupPlacesByDays();
  const currentDayData = groupedPlaces.find(day => day.day === currentDay);

  // Debug logging
  console.log('RoutePreviewStep Debug:', {
    scenario,
    days,
    placesLength: places?.length,
    groupedPlaces,
    currentDay,
    currentDayData,
    totalDays: groupedPlaces.length
  });

  return (
    <div className="chat-card text-left h-screen overflow-hidden flex flex-col relative">
      {/* Floating Action Menu */}
      <div className="absolute top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white shadow-lg hover:shadow-xl w-10 h-10 p-0 flex items-center justify-center border border-gray-300">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg z-50">
            <DropdownMenuItem onClick={() => handleOpenDayInGoogleMaps(currentDayData?.places || places)} className="cursor-pointer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Google Maps
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveRoute} disabled={!userSessionId || saving} className="cursor-pointer">
              <Save className="mr-2 h-4 w-4" />
              {saved ? 'Route Saved!' : saving ? 'Saving...' : 'Save Route'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRegenerate} className="cursor-pointer">
              <Repeat className="mr-2 h-4 w-4" />
              Generate Again
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="font-semibold text-lg mb-3 flex items-center gap-2">
        📍 Your {scenario === "planning" ? `${days}-day trip itinerary` : "custom route"}
      </div>
      
      {error && (
        <div className="text-red-500 mb-3">{error}</div>
      )}
      
      {!error && (
        <>
          {/* Day Navigation - compact version */}
          {scenario === "planning" && days > 1 && (
            <div className="flex items-center justify-center mb-4 gap-2">
              <button
                onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
                disabled={currentDay === 1}
                className={`p-1 rounded-full transition-colors ${
                  currentDay === 1 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: days }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    onClick={() => setCurrentDay(day)}
                    className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                      currentDay === day
                        ? 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentDay(Math.min(days, currentDay + 1))}
                disabled={currentDay === days}
                className={`p-1 rounded-full transition-colors ${
                  currentDay === days 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Route Content - Full Height */}
          {places && places.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
              <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white p-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {scenario === "planning" && currentDayData && (
                    <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {currentDayData.day}
                    </span>
                  )}
                  {scenario === "planning" ? `Day ${currentDayData?.day || 1}` : "Your Route"}
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 space-y-2">
                  {(currentDayData?.places || places).map((p, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      {/* Compact Place Image */}
                      <div className="w-full h-24 overflow-hidden">
                        {p.photoUrl ? (
                          <img 
                            src={p.photoUrl} 
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-24 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center ${p.photoUrl ? 'hidden' : ''}`}>
                          <div className="text-green-600 text-xs font-medium">📍 {p.name}</div>
                        </div>
                      </div>
                      
                      {/* Compact Place Info */}
                      <div className="p-2">
                        <div className="font-semibold text-sm mb-1">
                          {`${i + 1}. ${p.name}`}
                        </div>
                        <div className="text-gray-600 text-xs flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3" />
                          {p.address}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-3 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            🚶 {p.walkingTime} min
                          </span>
                          {p.type && <span>{p.type}</span>}
                        </div>
                        {p.description && (
                          <div className="text-xs mt-1 text-gray-700 bg-white p-2 rounded leading-relaxed">
                            {p.description}
                          </div>
                        )}
                        
                        {/* Compact Google Maps link */}
                        {p.lat && p.lon && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                          >
                            📍 Maps
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Compact Bottom Link */}
      <div className="text-center py-2 border-t border-gray-100 bg-white">
        <a
          href="https://turnright.city/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#008457] underline text-xs hover:text-[#00BC72] transition-colors"
        >
          TurnRight.city
        </a>
      </div>
    </div>
  );
};

export default RoutePreviewStep;
