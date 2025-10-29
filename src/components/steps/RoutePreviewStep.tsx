import React, { useState } from "react";
import Button from "../Button";
import { Repeat, MapPin, Clock, ChevronLeft, ChevronRight, Download, Save, Check, MoreVertical, ExternalLink } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import Map from "../Map";
import CategoryBadge from "../CategoryBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnalytics } from "@/hooks/useAnalytics";

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
  onStartNew?: () => void; // Add start new dialog callback
  onShowDayMap?: (dayPlaces: LLMPlace[]) => void; // Add callback for showing day-specific map
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
  onStartNew,
  onShowDayMap,
}) => {
  const [processing, setProcessing] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const { trackButtonClick } = useAnalytics();
  
  const { user } = useAuth();

  // Open specific day route in Google Maps
  function handleOpenDayInGoogleMaps(dayPlaces: LLMPlace[]) {
    if (!dayPlaces || dayPlaces.length === 0) return;
    
    trackButtonClick("click_open_in_google_maps", "Open in Google Maps");
    
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

  // Handle route save - generate and download PDF  
  const handleSaveRoute = async () => {
    if (places.length === 0) {
      console.error('Cannot save route: no places available');
      return;
    }

    trackButtonClick("click_download_route", "Download route");

    // Check if user is authenticated for saving to database
    const canSaveToDatabase = user && user.id;

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

      const routeData = {
        routeName,
        location,
        scenario,
        days,
        goals,
        places,
        totalWalkingTime,
        mapUrl
      };

      // Call edge function to generate PDF
      const response = await supabase.functions.invoke('generate-route-pdf', {
        body: { routeData }
      });

      if (response.error) {
        console.error('Error generating PDF:', response.error);
        return;
      }

      // Create blob from HTML content and download
      const htmlContent = response.data;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${routeName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      console.log('Route PDF generated and downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating route PDF:', error);
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
    
    // For planning scenario, use the day property from the backend
    console.log('=== GROUPING DEBUG ===');
    console.log('Total places:', places.length);
    console.log('Days:', days);
    
    // Group places by their day property (assigned by backend)
    const dayGroups: Record<number, LLMPlace[]> = {};
    
    places.forEach(place => {
      const placeDay = place.day || 1; // Default to day 1 if not set
      if (!dayGroups[placeDay]) {
        dayGroups[placeDay] = [];
      }
      dayGroups[placeDay].push(place);
    });
    
    // Convert to array format and sort by day
    const groupedPlaces = Object.entries(dayGroups)
      .map(([day, dayPlaces]) => ({
        day: Number(day),
        places: dayPlaces
      }))
      .sort((a, b) => a.day - b.day);
    
    console.log('Grouped places result:', groupedPlaces);
    console.log('Places per day:', groupedPlaces.map(g => `Day ${g.day}: ${g.places.length} places`));
    
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
    <div className="text-left flex flex-col relative p-4 pb-20">
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
            <DropdownMenuItem onClick={handleSaveRoute} disabled={saving} className="cursor-pointer">
              <Save className="mr-2 h-4 w-4" />
              {saved ? 'Route Saved!' : saving ? 'Saving...' : user ? 'Save & Download Route' : 'Download Route'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRegenerate} className="cursor-pointer">
              <Repeat className="mr-2 h-4 w-4" />
              Generate Again
            </DropdownMenuItem>
            {onStartNew && (
              <DropdownMenuItem onClick={onStartNew} className="cursor-pointer">
                <Check className="mr-2 h-4 w-4" />
                Start New Dialog
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="font-semibold text-lg mb-3 flex items-center gap-2">
        📍 Your {scenario === "planning" ? `${days}-day trip itinerary` : "custom route"}
      </div>

      {/* Removed selected categories banner per request */}
      
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

          {/* Interactive Map Preview - Collapsible on Mobile */}
          {places && places.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowMap(!showMap)}
                className="w-full mb-2 px-4 py-2 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white rounded-lg font-medium flex items-center justify-between hover:opacity-90 transition-opacity"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Route Map Preview
                </span>
                <span className="text-sm">{showMap ? '▼ Hide' : '▶ Show'}</span>
              </button>
              
              {showMap && (
                <div className="touch-pan-y">
                  <Map 
                    places={currentDayData?.places || places} 
                    origin={location}
                    destinationType={"none"}
                    className="h-[250px] md:h-[400px] w-full rounded-lg border-2 border-primary/20 shadow-lg" 
                  />
                </div>
              )}
            </div>
          )}

          {/* Route Content - Full Height */}
          {places && places.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
              {/* Day Content with individual map link */}
              <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {scenario === "planning" && currentDayData && (
                      <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                        {currentDayData.day}
                      </span>
                    )}
                    {scenario === "planning" ? `Day ${currentDayData?.day || 1}` : "Your Route"}
                  </h3>
                  
                  {/* Individual Day Map Button for Planning Scenario */}
                  {scenario === "planning" && currentDayData && onShowDayMap && (
                    <button
                      onClick={() => onShowDayMap(currentDayData.places)}
                      className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      Show Map
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-3 pb-6 space-y-3">
                  {(currentDayData?.places || places).map((p, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col sm:flex-row">
                      {/* Place Image - Left side on desktop, top on mobile */}
                      <div className="w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 overflow-hidden relative">
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
                        <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ${p.photoUrl ? 'hidden' : ''}`}>
                          <div className="text-primary text-sm font-medium">📍 {p.name}</div>
                        </div>
                        {/* Place number badge */}
                        <div className="absolute top-2 left-2 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                          {i + 1}
                        </div>
                      </div>
                      
                      {/* Place Info - Right side on desktop, bottom on mobile */}
                      <div className="flex-1 p-3 space-y-2 min-w-0">
                        {/* Place name - Full visibility */}
                        <div className="font-bold text-base leading-tight break-words pr-1">
                          {p.name}
                        </div>
                        
                        {/* Category Badge */}
                        {p.goalMatched && (
                          <div className="flex items-center gap-2">
                            <CategoryBadge 
                              category={p.goalMatched} 
                              size="sm" 
                              showCoolScore={true}
                              coolScore={p.coolScore || 0}
                            />
                          </div>
                        )}
                        
                        {/* Address - Properly wrapped */}
                        <div className="text-gray-600 text-xs flex items-start gap-1 leading-snug">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{p.address}</span>
                        </div>
                        
                        {/* Time info - Clean horizontal layout */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>🚶 {p.walkingTime} min</span>
                          </div>
                          {p.visitDuration && (
                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full">
                              <span>⏱️ {p.visitDuration} min visit</span>
                            </div>
                          )}
                          {p.type && (
                            <div className="text-gray-500 text-xs px-2 py-1">
                              {p.type}
                            </div>
                          )}
                        </div>
                        
                        {/* Description - Properly formatted with max height */}
                        {p.description && (
                          <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded leading-relaxed break-words line-clamp-3">
                            {p.description}
                          </div>
                        )}
                        
                        {/* Google Maps link - Clear and accessible */}
                        {p.lat && p.lon && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors font-medium"
                          >
                            <MapPin className="w-3 h-3" />
                            View on Maps
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All Days Navigation for Planning Scenario */}
          {scenario === "planning" && days > 1 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-green-900 mb-3">All Days Navigation</h4>
              <div className="grid grid-cols-1 gap-2">
                {groupedPlaces.map(dayData => (
                  <div key={dayData.day} className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white text-xs font-bold flex items-center justify-center">
                        {dayData.day}
                      </span>
                      <span className="font-medium text-gray-700">
                        Day {dayData.day} ({dayData.places.length} places)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDayInGoogleMaps(dayData.places)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google Maps
                      </button>
                      {onShowDayMap && (
                        <button
                          onClick={() => onShowDayMap(dayData.places)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          Interactive Map
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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