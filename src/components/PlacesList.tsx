
import React from "react";
import type { LLMPlace } from "@/hooks/useOpenAI";

type Props = {
  places: LLMPlace[];
};

const PlacesList: React.FC<Props> = ({ places }) => {
  console.log("=== PlacesList Debug ===");
  console.log("Places received:", places);
  places.forEach((place, i) => {
    console.log(`Place ${i}:`, {
      name: place.name,
      hasPhotoUrl: !!place.photoUrl,
      photoUrl: place.photoUrl
    });
  });

  if (!places.length) {
    return <div className="text-red-500 text-base p-4 mb-2 rounded bg-red-50">No places found. Try changing your search goals or move your location a bit!</div>;
  }
  return (
    <ul className="space-y-4">
      {places.map((place, i) => (
        <li key={i} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col gap-3">
          {place.photoUrl && (
            <div className="w-full h-40 rounded-lg overflow-hidden">
              <img 
                src={place.photoUrl} 
                alt={place.name}
                className="w-full h-full object-cover"
                onLoad={() => console.log(`Photo loaded for ${place.name}`)}
                onError={(e) => {
                  console.error(`Photo failed to load for ${place.name}:`, place.photoUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div>
            <div className="text-lg font-semibold">{place.name}</div>
            <div className="text-sm text-gray-600 mb-1">{place.address}</div>
            <div className="text-xs text-gray-500">
              🚶 {place.walkingTime} min walk {place.type ? `| Type: ${place.type}` : ""}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default PlacesList;
