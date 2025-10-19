
import React, { useState } from "react";
import { MapPin, Clock, Info, ArrowLeft } from "lucide-react";
import Button from "./Button";
import CategoryBadge from "./CategoryBadge";
import type { LLMPlace } from "@/hooks/useOpenAI";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  places: LLMPlace[];
  onBack: () => void;
  location?: string;
};

const MapNavigation: React.FC<Props> = ({ places, onBack, location }) => {
  const [selectedPlace, setSelectedPlace] = useState<LLMPlace | null>(null);

  const handlePlaceClick = (place: LLMPlace) => {
    console.log("Place clicked:", place.name);
    setSelectedPlace(place);
  };

  const handleCloseDialog = () => {
    console.log("Closing dialog");
    setSelectedPlace(null);
  };

  return (
    <div className="chat-card text-left">
      <div className="font-semibold text-lg mb-3 flex items-center gap-2">
        🗺️ Your Route in {location}
      </div>
      
      <div className="bg-[#F6FDF9] px-4 py-3 rounded-lg text-base mb-6">
        <div className="space-y-4">
          {places.map((place, i) => (
            <div 
              key={i} 
              className="mb-3 p-4 rounded-lg hover:bg-white/50 cursor-pointer transition-colors border border-transparent hover:border-green-200"
              onClick={() => handlePlaceClick(place)}
            >
              {/* Display place NAME very prominently */}
              <div className="font-bold text-xl text-gray-900 mb-2">
                {`${i + 1}. ${place.name}`}
              </div>
              
              {/* Category Badge */}
              {place.goalMatched && (
                <div className="mb-2">
                  <CategoryBadge 
                    category={place.goalMatched} 
                    size="md" 
                    showCoolScore={true}
                    coolScore={place.coolScore || 0}
                  />
                </div>
              )}
              
              {/* Instruction to search for the place name */}
              <div className="text-gray-700 text-base flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="font-medium">Search for "{place.name}" in your map app</span>
              </div>
              
              <div className="text-sm text-gray-600 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  🚶 {place.walkingTime} min walk
                </span>
                {place.type && <span>Type: {place.type}</span>}
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              
              {place.reason && (
                <div className="text-sm mt-2 text-[#008457] font-medium">{place.reason}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 mr-2 -ml-1" /> Back to Search
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

      {/* Place Details Dialog */}
      <Dialog open={!!selectedPlace} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedPlace?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlace && (
            <div className="space-y-4">
              {/* Emphasize place name for map searching */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <DialogDescription className="text-sm text-green-700 font-semibold mb-2">
                  📍 How to find this place
                </DialogDescription>
                <p className="text-lg font-bold text-gray-900 mb-2">{selectedPlace.name}</p>
                <p className="text-sm text-gray-700">
                  Search for exactly "<strong>{selectedPlace.name}</strong>" in Google Maps, Apple Maps, or your preferred navigation app.
                </p>
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
                <div className="p-3 bg-blue-50 rounded-lg">
                  <DialogDescription className="text-sm text-blue-700 font-medium">
                    Why this place?
                  </DialogDescription>
                  <p className="text-sm text-gray-700 mt-1">{selectedPlace.reason}</p>
                </div>
              )}

              {/* Show address only as reference if available */}
              {selectedPlace.address && (
                <div className="text-xs text-gray-500 border-t pt-3">
                  <span className="font-medium">Reference address:</span> {selectedPlace.address}
                  <br />
                  <span className="italic">Note: Search by business name for best results</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapNavigation;
