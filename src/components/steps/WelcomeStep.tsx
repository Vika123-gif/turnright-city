
import React, { useState } from "react";
import Button from "../Button";
import { MapPin } from "lucide-react";
import LisbonWaitlistModal from "../LisbonWaitlistModal";

type Props = {
  onLocation: (loc: string, exitAction: 'detect_location' | 'manual_input') => void;
  value?: string | null;
};

const WelcomeStep: React.FC<Props> = ({ onLocation, value }) => {
  const [loc, setLoc] = useState<string>(value || "");
  const [detecting, setDetecting] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);

  const isInLisbon = (lat: number, lon: number) => {
    const bounds = {
      minLat: 38.68,
      maxLat: 38.82,
      minLon: -9.28,
      maxLon: -9.05
    };
    return lat >= bounds.minLat && lat <= bounds.maxLat && 
           lon >= bounds.minLon && lon <= bounds.maxLon;
  };

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
          
          if (!isInLisbon(lat, lon)) {
            setDetecting(false);
            setShowWaitlistModal(true);
            return;
          }
          
          const coords = lat.toFixed(5) + "," + lon.toFixed(5);
          setLoc(coords);
          setDetecting(false);
          onLocation(coords, 'detect_location');
        },
        (err) => {
          alert("Failed to get location. You can enter it manually.");
          setDetecting(false);
        }
      );
    } else {
      alert("Geolocation not supported.");
      setDetecting(false);
    }
  };


  return (
    <div className="chat-card text-left fade-in">
      <div className="mb-8 flex flex-row items-start gap-4">
        <div className="text-3xl animate-pulse">👋</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-2">
            I'm TurnRight, your personal city guide. 
          </h2>
          <p className="text-lg text-gray-600 font-medium">
            I'll whip up a best route for you in seconds, tailored to what you want! Ready to explore? Let's go!
          </p>
        </div>
      </div>
      
      <div className="chatbot-bubble mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <span className="font-medium">Share your location and let's get started!</span>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
          <input
            type="checkbox"
            id="locationConsent"
            checked={locationConsent}
            onChange={(e) => setLocationConsent(e.target.checked)}
            className="consent-checkbox mt-0.5"
          />
          <label htmlFor="locationConsent" className="text-sm text-gray-700 font-medium leading-relaxed">
            I consent to sharing my location to get personalized recommendations
          </label>
        </div>
        
        <Button
          variant="primary"
          onClick={handleDetectLocation}
          disabled={detecting || !locationConsent}
          className="relative overflow-hidden group"
        >
          <MapPin className="w-6 h-6 mr-3 transition-transform group-hover:scale-110" />
          <span className="font-semibold">
            {detecting ? "🔍 Detecting..." : "📍 Share Location"}
          </span>
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">or enter location manually</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="e.g., 123 Main St, Paris"
            className="location-input flex-1"
            value={loc}
            onChange={e => setLoc(e.target.value)}
            disabled={detecting}
          />
          <Button
            variant="outline"
            className="px-6 py-3 min-w-[80px] font-semibold"
            onClick={() => onLocation(loc, 'manual_input')}
            disabled={!loc || detecting}
          >
            Go
          </Button>
        </div>
      </div>

      {/* MVP Link */}
      <div className="border-t border-gray-100 pt-6 mt-8 text-center">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <p className="text-sm text-gray-600 mb-3 font-medium">
            🌍 Save for the next generations!
          </p>
          <a
            href="https://turnright.city/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#008457] font-semibold text-sm hover:text-[#00BC72] transition-all duration-300 hover:scale-105 group"
          >
            <span>Visit TurnRight.city</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>

      <LisbonWaitlistModal 
        open={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
      />
    </div>
  );
};
export default WelcomeStep;
