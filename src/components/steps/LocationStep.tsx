import React, { useState } from "react";
import Button from "../Button";
import { MapPin, Send } from "lucide-react";

type Props = {
  onNext: (location: string) => void;
  value?: string;
};

const LocationStep: React.FC<Props> = ({ onNext, value }) => {
  const [locationConsent, setLocationConsent] = useState(false);
  const [locationInput, setLocationInput] = useState(value || "");
  const [detecting, setDetecting] = useState(false);

  const handleDetectLocation = () => {
    if (!locationConsent) {
      alert("Please consent to location access first.");
      return;
    }

    setDetecting(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const coords = lat.toFixed(5) + "," + lon.toFixed(5);
          
          setDetecting(false);
          onNext(coords);
        },
        (err) => {
          setDetecting(false);
          alert("Couldn't get your location. Please enter it manually below.");
        }
      );
    } else {
      setDetecting(false);
      alert("Location detection not supported. Please enter it manually below.");
    }
  };

  const handleManualLocation = () => {
    if (locationInput.trim()) {
      onNext(locationInput);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
        <input
          type="checkbox"
          id="locationConsent"
          checked={locationConsent}
          onChange={(e) => setLocationConsent(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-2 border-gray-300 text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
        />
        <label htmlFor="locationConsent" className="text-sm text-gray-700 leading-relaxed font-medium">
          I consent to sharing my location for personalized recommendations
        </label>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={handleDetectLocation}
          disabled={detecting || !locationConsent}
          className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 ${
            detecting || !locationConsent
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          <MapPin className="w-5 h-5" />
          {detecting ? "Detecting..." : "Share My Location"}
        </button>
        
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Or enter location manually..."
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleManualLocation()}
            className="flex-1 h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-sm font-medium"
          />
          <button
            onClick={handleManualLocation}
            disabled={!locationInput.trim()}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              !locationInput.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-105 active:scale-95"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationStep;