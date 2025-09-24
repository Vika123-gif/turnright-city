
import React, { useState } from "react";
import Button from "../Button";
import { Repeat, MapPin, Clock, ChevronLeft, ChevronRight, Download, Save, Check } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { supabase } from "@/integrations/supabase/client";
import { useDatabase } from "@/hooks/useDatabase";
import Map from "../Map";

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
    
    for (let day = 0; day < days; day++) {
      const startIndex = day * placesPerDay;
      const endIndex = Math.min(startIndex + placesPerDay, places.length);
      const dayPlaces = places.slice(startIndex, endIndex);
      
      if (dayPlaces.length > 0) {
        groupedPlaces.push({
          day: day + 1,
          places: dayPlaces
        });
      }
    }
    
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
    <div className="chat-card text-left h-screen overflow-y-auto flex flex-col">
      <div className="font-semibold text-lg mb-3 flex items-center gap-2">
        📍 Your {scenario === "planning" ? `${days}-day trip itinerary` : "custom route"}
      </div>
      
      {error && (
        <div className="text-red-500 mb-3">{error}</div>
      )}
      
      {!error && (
        <>
          {/* Day Navigation - only show for planning scenario with multiple days */}
          {scenario === "planning" && days > 1 && (
            <div className="flex items-center justify-between mb-4 bg-white rounded-lg p-3 border border-gray-200">
              <button
                onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
                disabled={currentDay === 1}
                className={`p-2 rounded-full transition-colors ${
                  currentDay === 1 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: days }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    onClick={() => setCurrentDay(day)}
                    className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
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
                className={`p-2 rounded-full transition-colors ${
                  currentDay === days 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Current Day Content */}
          {places && places.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex-1">
              <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white p-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {scenario === "planning" && currentDayData && (
                    <span className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {currentDayData.day}
                    </span>
                  )}
                  {scenario === "planning" ? `Day ${currentDayData?.day || 1}` : "Your Route"}
                </h3>
              </div>
              
              <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {(currentDayData?.places || places).map((p, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    {/* Place Image */}
                    <div className="w-full h-32 overflow-hidden">
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
                      <div className={`w-full h-32 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center ${p.photoUrl ? 'hidden' : ''}`}>
                        <div className="text-green-600 text-sm font-medium">📍 {p.name}</div>
                      </div>
                    </div>
                    
                    {/* Place Info */}
                    <div className="p-3">
                      <div className="font-semibold text-base mb-1">
                        {`${i + 1}. ${p.name}`}
                      </div>
                      <div className="text-gray-600 text-sm flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {p.address}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          🚶 {p.walkingTime} min walk
                        </span>
                        {p.type && <span>Type: {p.type}</span>}
                      </div>
                      {p.description && (
                        <div className="text-sm mt-2 text-gray-700 bg-white p-2 rounded leading-relaxed">
                          {p.description}
                        </div>
                      )}
                      
                      {/* Google Maps link for each place */}
                      {p.lat && p.lon && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 transition-colors"
                        >
                          📍 Open in Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Action buttons - always visible when places exist */}
      {places && places.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-4">
          <div className="p-4 space-y-3">
            <Button 
              variant="outline"
              onClick={() => handleOpenDayInGoogleMaps(currentDayData?.places || places)}
              disabled={purchasing || processing}
              className="w-full flex items-center justify-center gap-2"
            >
              🌍 {scenario === "onsite" ? "Open Full Route in Google Maps" : "Open Route in Google Maps"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleSaveRoute}
              disabled={purchasing || processing || saving || !userSessionId}
              className="w-full flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Route Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : (scenario === "onsite" ? "Save Route" : "Save Trip")}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-4 sticky bottom-0 bg-white pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onRegenerate} disabled={purchasing || processing}>
          <Repeat className="w-5 h-5 mr-2 -ml-1" /> Generate Again
        </Button>

        {/* MVP Link */}
        <div className="border-t pt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Save for the next generations!
          </p>
          <a
            href="https://turnright.city/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#008457] underline font-medium text-sm hover:text-[#00BC72] transition-colors"
          >
            Visit TurnRight.city
          </a>
        </div>
      </div>
    </div>
  );
};

export default RoutePreviewStep;
