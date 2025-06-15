
import React from "react";
import type { GooglePlacesDebug } from "@/hooks/useGooglePlaces";

type Props = {
  debug: GooglePlacesDebug | null;
};

const DebugInfo: React.FC<Props> = ({ debug }) => {
  if (!debug) return null;

  const [lat, lng] = debug.location.split(",", 2);

  return (
    <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4 mt-3 mb-2 text-xs">
      <strong>Debug Info:</strong>
      <ul className="ml-2 mt-1 space-y-0.5">
        <li>
          <b>Your location:</b> {lat} , {lng}
        </li>
        <li>
          <b>Search radius:</b> {debug.searchRadius}m
        </li>
        <li>
          <b>Place types searched:</b> [{debug.goals.join(", ")}]
        </li>
        <li>
          <b>Places found:</b> {debug.initialFound}
        </li>
        <li>
          <b>Places within {debug.walkingLimit}min walk:</b> {debug.afterWalkingFilter}
        </li>
        <li>
          <b>Types returned:</b> [{debug.filteredTypes.join(", ")}]
        </li>
      </ul>
    </div>
  );
};

export default DebugInfo;
