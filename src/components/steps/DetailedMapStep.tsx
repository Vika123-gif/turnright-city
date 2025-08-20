import React from "react";
import Button from "../Button";
import Map from "../Map";
import { MapPin, Clock, ExternalLink, Star } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";

type Props = {
  places: LLMPlace[];
  onBack: () => void;
  onReset: () => void;
  origin: string;
};

const DetailedMapStep: React.FC<Props> = ({
  places,
  onBack,
  onReset,
  origin,
}) => {
  // Log the complete places data structure to debug missing fields
  console.log("=== DetailedMapStep Places Data Check ===");
  console.log("Origin:", origin);
  console.log("Places array length:", places?.length || 0);
  places?.forEach((place, i) => {
    console.log(`Place ${i}:`, {
      name: place.name,
      address: place.address,
      lat: place.lat,
      lon: place.lon,
      coordinates: place.coordinates,
      photoUrl: place.photoUrl ? 'HAS_PHOTO' : 'NO_PHOTO',
      walkingTime: place.walkingTime,
      type: place.type,
      reason: place.reason
    });
  });
  console.log("========================================");

  const makeGoogleMapsLink = (place: LLMPlace) => {
    console.log(`=== DEBUG: Individual place link ===`);
    console.log(`Place: ${place.name}`);
    console.log(`Address: ${place.address}`);
    console.log(`Coordinates: lat=${place.lat}, lon=${place.lon}`);
    
    let url;
    // Use coordinates if available for better accuracy
    if (place.lat && place.lon) {
      url = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
      console.log(`Using coordinates for link`);
    } else if (place.address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
      console.log(`Using address for link`);
    } else {
      // Fallback to place name
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
      console.log(`Using place name as fallback for link`);
    }
    
    console.log(`Generated URL: ${url}`);
    return url;
  };

  const makeGoogleMapsRoute = (origin: string, places: LLMPlace[] = []) => {
    console.log(`=== DEBUG: Route link generation ===`);
    console.log(`Origin: "${origin}"`);
    console.log(`Places count: ${places.length}`);
    console.log(`Places full data:`, places.map(p => ({ 
      name: p.name, 
      address: p.address, 
      lat: p.lat, 
      lon: p.lon,
      coordinates: p.coordinates 
    })));
    
    if (!places.length) {
      console.log(`No places, returning default maps URL`);
      return `https://maps.google.com`;
    }

    // Use coordinates for origin if it looks like coordinates, otherwise encode as string
    const originParam = origin.includes(',') || /^[-]?\d+\.?\d*,[-]?\d+\.?\d*$/.test(origin) 
      ? origin 
      : encodeURIComponent(origin.trim());
    
    console.log(`Origin param: ${originParam}`);

    // Build waypoints using coordinates when available
    const waypoints = places.slice(0, -1).map(p => {
      let waypoint;
      if (p.lat && p.lon) {
        waypoint = `${p.lat},${p.lon}`;
        console.log(`Waypoint (coords): ${p.name} -> ${waypoint}`);
      } else if (p.coordinates && p.coordinates.length === 2) {
        waypoint = `${p.coordinates[1]},${p.coordinates[0]}`; // coordinates are [lng, lat]
        console.log(`Waypoint (coordinates array): ${p.name} -> ${waypoint}`);
      } else if (p.address) {
        waypoint = encodeURIComponent(p.address);
        console.log(`Waypoint (address): ${p.name} -> ${waypoint}`);
      } else {
        waypoint = encodeURIComponent(p.name);
        console.log(`Waypoint (name fallback): ${p.name} -> ${waypoint}`);
      }
      return waypoint;
    });
    
    // Build destination using coordinates when available
    const lastPlace = places[places.length - 1];
    let destination;
    if (lastPlace?.lat && lastPlace?.lon) {
      destination = `${lastPlace.lat},${lastPlace.lon}`;
      console.log(`Destination (coords): ${lastPlace.name} -> ${destination}`);
    } else if (lastPlace?.coordinates && lastPlace.coordinates.length === 2) {
      destination = `${lastPlace.coordinates[1]},${lastPlace.coordinates[0]}`; // coordinates are [lng, lat]
      console.log(`Destination (coordinates array): ${lastPlace.name} -> ${destination}`);
    } else if (lastPlace?.address) {
      destination = encodeURIComponent(lastPlace.address);
      console.log(`Destination (address): ${lastPlace.name} -> ${destination}`);
    } else {
      destination = encodeURIComponent(lastPlace?.name || "");
      console.log(`Destination (name fallback): ${lastPlace?.name} -> ${destination}`);
    }

    let url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destination}&travelmode=walking`;
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.join("|")}`;
    }
    
    console.log(`Generated route URL: ${url}`);
    return url;
  };

  return (
    <div className="chat-card text-left">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        🗺️ Your Route Map & Details
      </div>
      
      {/* Interactive Map */}
      {places && places.length > 0 && (
        <div className="mb-6">
          <Map places={places} className="h-[300px] w-full rounded-lg" />
        </div>
      )}
      
      {/* Detailed Places List */}
      <div className="space-y-4 mb-6">
        {places.map((place, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Place Image with Overlay */}
            <div className="relative">
              {place.photoUrl ? (
                <div className="w-full h-40 overflow-hidden">
                  <img 
                    src={place.photoUrl} 
                    alt={place.name}
                    className="w-full h-full object-cover"
                    onLoad={() => console.log(`DetailedMapStep: Photo loaded for ${place.name}`)}
                    onError={(e) => {
                      console.error(`DetailedMapStep: Photo failed to load for ${place.name}:`, place.photoUrl);
                      // Hide image and show fallback
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-40 bg-gradient-to-br from-blue-100 via-green-100 to-blue-200 items-center justify-center hidden">
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="relative text-white text-lg font-bold text-center px-4">
                      {place.name}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 via-green-100 to-blue-200 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative text-white text-lg font-bold text-center px-4">
                    {place.name}
                  </div>
                </div>
              )}
              <div className="absolute top-3 left-3 bg-white/90 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                #{i + 1}
              </div>
              {place.photoUrl && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="text-white text-lg font-bold text-center px-4">
                    {place.name}
                  </div>
                </div>
              )}
            </div>
            
            {/* Detailed Info */}
            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{place.name}</h3>
              
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                <span className="text-gray-600 text-sm">{place.address}</span>
              </div>
              
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  🚶 {place.walkingTime} min walk
                </span>
                {place.type && (
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {place.type}
                  </span>
                )}
              </div>
              
              {place.reason && (
                <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-3">
                  <div className="text-sm text-green-700">{place.reason}</div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <a
                  href={makeGoogleMapsLink(place)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                  onClick={(e) => {
                    const url = makeGoogleMapsLink(place);
                    console.log(`Clicking individual place link: ${url}`);
                    // Let the default behavior handle the link
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Maps
                </a>
                <button className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                  <Star className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Route Navigation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Complete Route Navigation</h4>
        <p className="text-blue-700 text-sm mb-3">
          Get turn-by-turn directions for your entire route
        </p>
        <a
          href={makeGoogleMapsRoute(origin, places)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          onClick={(e) => {
            const url = makeGoogleMapsRoute(origin, places);
            console.log(`Clicking route link: ${url}`);
            // Let the default behavior handle the link
          }}
        >
          <MapPin className="w-4 h-4" />
          Open Full Route
        </a>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Back to Route
        </Button>
        <Button variant="primary" onClick={onReset}>
          Plan New Route
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
    </div>
  );
};

export default DetailedMapStep;