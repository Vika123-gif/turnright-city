
import React, { useState, useEffect } from "react";
import Button from "../Button";
import { MapPin } from "lucide-react";
import LocationConsentDialog from "../LocationConsentDialog";
import LisbonWaitlistModal from "../LisbonWaitlistModal";

type Props = {
  onLocation: (loc: string, exitAction: 'detect_location' | 'manual_input') => void;
  value?: string | null;
};

const WelcomeStep: React.FC<Props> = ({ onLocation, value }) => {
  const [loc, setLoc] = useState<string>(value || "");
  const [detecting, setDetecting] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [consentGranted, setConsentGranted] = useState<boolean | null>(null);

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
    if (consentGranted === null) {
      setShowConsentDialog(true);
      return;
    }
    
    if (!consentGranted) {
      return; // User denied consent
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

  const handleConsentResponse = (granted: boolean) => {
    setConsentGranted(granted);
    setShowConsentDialog(false);
    if (granted) {
      // Automatically trigger location detection after consent
      setTimeout(() => handleDetectLocation(), 100);
    }
  };

  useEffect(() => {
    // Show consent dialog on component mount
    setShowConsentDialog(true);
  }, []);

  return (
    <div className="chat-card text-left">
      <div className="mb-6 flex flex-row items-center gap-3">
        <div className="text-2xl">👋</div>
        <h2 className="text-xl font-semibold">Hi! I'll help you find the best places nearby<br />for your trip.</h2>
      </div>
      <div className="chatbot-bubble mb-3">
        Share your location and let's get started!
      </div>
      <div>
        <Button
          variant="primary"
          onClick={handleDetectLocation}
          disabled={detecting || consentGranted === false}
        >
          <MapPin className="w-6 h-6 mr-2 -ml-1" />
          {detecting ? "Detecting..." : 
           consentGranted === false ? "Location access denied" : 
           "📍 Share Location"}
        </Button>
        <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
          <span>or enter location:</span>
          <input
            type="text"
            placeholder="e.g., 123 Main St, Paris"
            className="border rounded-lg px-3 py-2 w-full max-w-[60%] shadow"
            value={loc}
            onChange={e => setLoc(e.target.value)}
            disabled={detecting}
          />
          <Button
            variant="outline"
            className="ml-2"
            style={{ minWidth: 0, minHeight: "44px", width: "auto" }}
            onClick={() => onLocation(loc, 'manual_input')}
            disabled={!loc || detecting}
          >
            OK
          </Button>
        </div>
      </div>

      {/* MVP Link */}
      <div className="border-t pt-4 mt-6 text-center">
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

      <LocationConsentDialog 
        open={showConsentDialog}
        onConsent={handleConsentResponse}
      />
      
      <LisbonWaitlistModal 
        open={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
      />
    </div>
  );
};
export default WelcomeStep;
