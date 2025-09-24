
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
};

const RoutePreviewStep: React.FC<Props> = ({
  places,
  onRegenerate,
  onBuy,
  purchasing,
  error,
  location = '',
  onTrackBuyClick,
}) => {
  const [processing, setProcessing] = useState(false);

  // Temporarily disable payment - show route directly
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

  // Create Google Maps URL for entire route
  const createRouteUrl = () => {
    if (!places.length) return '';
    
    const waypoints = places.map(p => `${p.lat},${p.lon}`).join('|');
    return `https://www.google.com/maps/dir/${waypoints}`;
  };

  return (
    <div className="chat-card text-left">
      <div className="font-semibold text-lg mb-3 flex items-center gap-2">
        📍 Here's what I found for you:
      </div>
      
      {error && (
        <div className="text-red-500 mb-3">{error}</div>
      )}
      
      {!error && (
        <>
          {/* Places List with Pictures */}
          <div className="space-y-3 mb-6">
            {places && places.length > 0 ? (
              places.map((p, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Place Image */}
                  <div className="w-full h-32 overflow-hidden">
                    {p.photoUrl ? (
                      <img 
                        src={p.photoUrl} 
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
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
                      <div className="text-sm mt-2 text-gray-700 bg-gray-50 p-2 rounded leading-relaxed">
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
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No results found. Try different time or goals.</div>
            )}
          </div>
        </>
      )}
      
      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={onRegenerate} disabled={purchasing || processing}>
          <Repeat className="w-5 h-5 mr-2 -ml-1" /> Generate Again
        </Button>
        
        {!error && places.length > 0 && (
          <>
            <Button 
              variant="primary" 
              onClick={handleShowRoute} 
              disabled={purchasing || processing}
            >
              {processing ? "Loading Route..." : "🗺️ Show Interactive Map"}
            </Button>
            
            {/* Google Maps route button */}
            <a
              href={createRouteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-500 text-white font-semibold rounded-xl text-lg flex items-center justify-center min-h-[56px] px-6 py-3 transition-all duration-300 hover:bg-blue-600 text-center"
            >
              🗺️ Open Full Route in Google Maps
            </a>
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
