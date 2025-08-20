
import React from "react";

export type Place = {
  name: string;
  address: string;
  walkingTime: number;
  type?: string;
  photoUrl?: string;
};

type Props = {
  places: Place[];
};

const PlacesList: React.FC<Props> = ({ places }) => {
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
                onError={(e) => {
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
