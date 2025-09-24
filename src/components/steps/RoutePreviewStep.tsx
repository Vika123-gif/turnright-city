
import React, { useState } from "react";
import Button from "../Button";
import { Repeat, MapPin, Clock } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { supabase } from "@/integrations/supabase/client";
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
}) => {
  const [processing, setProcessing] = useState(false);

  // Show interactive map with all generated places
  function handleShowRoute() {
    console.log("=== DEBUG: handleShowRoute called (payment disabled) ===");
    console.log("Current places:", places);
    console.log("Current location:", location);
    
    // Track the buy button click for analytics
    if (onTrackBuyClick) {
      onTrackBuyClick(location, places.length);
    }
    
    // Directly call onBuy to show the route without payment
    onBuy();
  }

  // Open entire route in Google Maps
  function handleOpenInGoogleMaps() {
    if (!places || places.length === 0) return;
    
    // Build waypoints from places with coordinates
    const waypoints = places
      .filter(place => place.lat && place.lon)
      .map(place => `${place.lat},${place.lon}`)
      .join('/');
    
    if (waypoints) {
      const googleMapsUrl = `https://www.google.com/maps/dir/${waypoints}`;
      window.open(googleMapsUrl, '_blank');
    }
  }

  // Group places by days
  const groupPlacesByDays = () => {
    const placesPerDay = Math.ceil(places.length / days);
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

  return (
    <div className="chat-card text-left h-screen overflow-y-auto flex flex-col">
      <div className="font-semibold text-lg mb-3 flex items-center gap-2">
        📍 Ваш маршрут на {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
      </div>
      
      {error && (
        <div className="text-red-500 mb-3">{error}</div>
      )}
      
      {!error && (
        <>
          {/* Places grouped by days */}
          <div className="space-y-6 mb-6">
            {groupedPlaces.map((dayGroup) => (
              <div key={dayGroup.day} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white p-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {dayGroup.day}
                    </span>
                    День {dayGroup.day}
                  </h3>
                </div>
                
                <div className="p-4 space-y-3">
                  {dayGroup.places.map((p, i) => (
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
                            🚶 {p.walkingTime} мин ходьбы
                          </span>
                          {p.type && <span>Тип: {p.type}</span>}
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
                            📍 Открыть в Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      <div className="flex flex-col gap-4 sticky bottom-0 bg-white pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onRegenerate} disabled={purchasing || processing}>
          <Repeat className="w-5 h-5 mr-2 -ml-1" /> Сгенерировать заново
        </Button>
        {!error && places.length > 0 && (
          <>
            <Button 
              variant="outline"
              onClick={handleOpenInGoogleMaps}
              disabled={purchasing || processing}
            >
              🌍 Открыть весь маршрут в Google Maps
            </Button>
            <Button 
              variant="primary" 
              onClick={handleShowRoute} 
              disabled={purchasing || processing}
            >
              {processing ? "Загружаю карту..." : "🗺️ Показать интерактивную карту"}
            </Button>
          </>
        )}

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
