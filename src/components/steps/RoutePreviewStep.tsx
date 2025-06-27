
import React, { useState } from "react";
import Button from "../Button";
import { Repeat, MapPin, Clock, Info } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [selectedPlace, setSelectedPlace] = useState<LLMPlace | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handlePlaceClick = (place: LLMPlace) => {
    setSelectedPlace(place);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPlace(null);
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
        <div className="bg-[#F6FDF9] px-4 py-3 rounded-lg text-base mb-6">
          {places && places.length > 0 ? (
            <div className="space-y-4">
              {places.map((p, i) => (
                <div 
                  key={i} 
                  className="mb-3 p-3 rounded-lg hover:bg-white/50 cursor-pointer transition-colors border border-transparent hover:border-green-200"
                  onClick={() => handlePlaceClick(p)}
                >
                  <div className="font-semibold text-base flex items-center gap-2">
                    {`${i + 1}. ${p.name}`}
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {p.address}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      🚶 {p.walkingTime} min walk
                    </span>
                    {p.type && <span>Type: {p.type}</span>}
                  </div>
                  {p.reason && (
                    <div className="text-sm mt-1 text-[#008457]">{p.reason}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>No results found. Try different time or goals.</div>
          )}
        </div>
      )}
      
      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={onRegenerate} disabled={purchasing || processing}>
          <Repeat className="w-5 h-5 mr-2 -ml-1" /> Generate Again
        </Button>
        {!error && places.length > 0 && (
          <Button 
            variant="primary" 
            onClick={handleShowRoute} 
            disabled={purchasing || processing}
          >
            {processing ? "Loading Route..." : "Show Route"}
          </Button>
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

      {/* Place Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {selectedPlace?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlace && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                <span className="text-sm text-gray-600">{selectedPlace.address}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">🚶 {selectedPlace.walkingTime} minutes walk</span>
              </div>
              
              {selectedPlace.type && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded"></div>
                  </div>
                  <span className="text-sm text-gray-600">Type: {selectedPlace.type}</span>
                </div>
              )}
              
              {selectedPlace.reason && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <DialogDescription className="text-sm text-[#008457] font-medium">
                    Why this place?
                  </DialogDescription>
                  <p className="text-sm text-gray-700 mt-1">{selectedPlace.reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoutePreviewStep;
