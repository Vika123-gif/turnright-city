
import React, { useState } from "react";
import Button from "../Button";
import { MapPin } from "lucide-react";


type Props = {
  onLocation: (loc: string, exitAction: 'detect_location' | 'manual_input') => void;
  value?: string | null;
};

const WelcomeStep: React.FC<Props> = ({ onLocation, value }) => {
  const [loc, setLoc] = useState<string>(value || "");
  const [detecting, setDetecting] = useState(false);
  
  const [locationConsent, setLocationConsent] = useState(false);

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
      <div className="mb-6 flex flex-row items-start gap-3">
        <div className="text-2xl animate-pulse">👋</div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 leading-tight mb-2">
            I'm TurnRight, your personal city guide. 
          </h2>
          <p className="text-base text-gray-600 font-medium">
            I'll whip up a best route for you in seconds, tailored to what you want! Ready to explore? Let's go!
          </p>
        </div>
      </div>
      
      <div className="chatbot-bubble mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <span className="font-medium text-sm">Share your location and let's get started!</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
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
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="e.g., 123 Main St, Paris"
            className="location-input w-full"
            value={loc}
            onChange={e => setLoc(e.target.value)}
            disabled={detecting}
          />
          <Button
            variant="outline"
            className="w-full font-semibold"
            onClick={() => onLocation(loc, 'manual_input')}
            disabled={!loc || detecting}
          >
            Go
          </Button>
        </div>
      </div>

      {/* MVP Link */}
      <div className="border-t border-gray-100 pt-4 mt-6 text-center">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs text-gray-600 mb-2 font-medium">
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

    </div>
  );
};
export default WelcomeStep;
