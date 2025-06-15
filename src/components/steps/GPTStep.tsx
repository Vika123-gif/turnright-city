
import React from "react";
import Button from "../Button";
import DebugInfo from "../DebugInfo";
import type { GooglePlacesDebug } from "@/hooks/useGooglePlaces";
import PlacesList, { Place } from "../PlacesList";

type Props = {
  places: Place[];
  loading: boolean;
  onDone: () => void;
  debugInfo?: GooglePlacesDebug | null;
};

const GPTStep: React.FC<Props> = ({
  places,
  loading,
  onDone,
  debugInfo,
}) => {
  // Log debug info for developer verification
  console.log("ResultsStep: debugInfo:", debugInfo);

  return (
    <div className="chat-card text-left min-h-[220px] flex flex-col justify-between gap-5">
      <div>
        {/* Prominent debug info at top */}
        <DebugInfo
          debug={debugInfo}
          style={{
            border: "2px solid #FFA500",
            background: "#FFFBEA",
            marginBottom: "20px",
            marginTop: 0,
            fontSize: "0.94em",
          }}
        />
        <div className="mb-3 text-lg">
          <span className="font-semibold">
            Searching for the best spots for you...
          </span>
        </div>
        {loading && (
          <div className="mt-6">
            <div className="w-full h-16 rounded-lg bg-[#f3f3f3] animate-pulse mb-2"></div>
            <div className="w-4/5 h-5 rounded bg-[#f3f3f3] animate-pulse"></div>
          </div>
        )}
        {!loading && <PlacesList places={places} />}
      </div>
      {!loading && places.length > 0 && (
        <Button variant="primary" onClick={onDone}>
          Next
        </Button>
      )}
    </div>
  );
};
export default GPTStep;
