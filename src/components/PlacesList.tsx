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
      photoUrl: place.photoUrl,
      walkingTime: place.walkingTime,
      visitDuration: place.visitDuration,
      hasDescription: !!place.description,
      description: place.description,
      hasOpeningHours: !!(place.openingHours && place.openingHours.length > 0),
      openingHours: place.openingHours,
      hasTicketPrice: !!place.ticketPrice,
      ticketPrice: place.ticketPrice,
      hasWebsite: !!place.website,
      website: place.website,
      day: place.day
    });
  });

  // Check if this is multi-day planning
  const isMultiDay = places.some(place => place.day && place.day > 1);
  
  // Group places by day if multi-day
  const placesByDay = isMultiDay 
    ? places.reduce((acc, place) => {
        const day = place.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(place);
        return acc;
      }, {} as Record<number, typeof places>)
    : { 1: places };

  // Calculate total route time
  const totalWalkingTime = places.reduce((sum, place) => sum + (place.walkingTime || 0), 0);
  const totalVisitTime = places.reduce((sum, place) => sum + (place.visitDuration || 0), 0);
  const totalRouteTime = totalWalkingTime + totalVisitTime;

  if (!places.length) {
    return <div className="text-red-500 text-base p-4 mb-2 rounded bg-red-50">No places found. Try changing your search goals or move your location a bit!</div>;
  }

  const renderPlace = (place: LLMPlace, index: number, dayKey?: string) => {
    const totalTimeAtPlace = (place.walkingTime || 0) + (place.visitDuration || 0);
    const uniqueKey = dayKey ? `${dayKey}-${index}` : index;
    
    return (
      <li key={uniqueKey} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col gap-3">
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
          <div className="text-sm text-gray-600 mb-2">{place.address}</div>
          
          {/* Time Information - moved up for prominence */}
          <div className="flex flex-wrap gap-2 text-xs mb-3">
            <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
              🚶 {place.walkingTime || 0} min walk
            </div>
            <div className="bg-green-50 text-green-600 px-2 py-1 rounded-full">
              ⏱️ {place.visitDuration || 0} min visit
            </div>
            <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
              Total: {totalTimeAtPlace} min
            </div>
          </div>
          
          {/* AI-Generated Description */}
          <div className="text-sm text-gray-700 mb-3 leading-relaxed bg-blue-50 p-3 rounded-lg border-l-4 border-blue-200">
            <div className="font-medium text-blue-800 mb-1">🤖 AI Description</div>
            {place.description || `A popular ${place.type || 'destination'} that offers a unique local experience. Perfect for exploring what the area has to offer.`}
          </div>
          
          {/* Practical Information */}
          <div className="space-y-2 mb-2">
            {place.ticketPrice && (
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className="text-primary">💰</span>
                <span className="font-medium">Price:</span> {place.ticketPrice}
              </div>
            )}
            
            {place.openingHours && place.openingHours.length > 0 && (
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-primary">🕒</span>
                  <span className="font-medium">Opening Hours:</span>
                </div>
                <div className="ml-6 space-y-1">
                  {place.openingHours.slice(0, 2).map((hours, idx) => (
                    <div key={idx} className="text-xs">{hours}</div>
                  ))}
                  {place.openingHours.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{place.openingHours.length - 2} more days
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {place.website && (
              <div className="text-sm">
                <a 
                  href={place.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 font-medium flex items-center gap-2"
                >
                  <span>🌐</span>
                  Visit Website
                </a>
              </div>
            )}
          </div>
          
          {place.type && (
            <div className="text-xs text-gray-500 mt-1">
              Type: {place.type}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {/* Route Summary */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
        <div className="text-base font-semibold text-gray-800 mb-2">
          📍 Route Summary {isMultiDay && `(${Object.keys(placesByDay).length} days)`}
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center">
            <div className="font-medium text-primary">{totalWalkingTime} min</div>
            <div className="text-gray-600">Walking</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-primary">{totalVisitTime} min</div>
            <div className="text-gray-600">Visiting</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-primary">{totalRouteTime} min</div>
            <div className="text-gray-600">Total Time</div>
          </div>
        </div>
      </div>

      {/* Places List - Group by day if multi-day */}
      {isMultiDay ? (
        Object.entries(placesByDay)
          .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
          .map(([day, dayPlaces]) => (
            <div key={day} className="space-y-4">
              <div className="bg-primary/10 rounded-lg p-3 border-l-4 border-primary">
                <h3 className="text-lg font-semibold text-primary">Day {day}</h3>
                <div className="text-sm text-gray-600">
                  {dayPlaces.length} places • 
                  {dayPlaces.reduce((sum, place) => sum + (place.walkingTime || 0) + (place.visitDuration || 0), 0)} min total
                </div>
              </div>
              <ul className="space-y-4">
                {dayPlaces.map((place, i) => renderPlace(place, i, day))}
              </ul>
            </div>
          ))
      ) : (
        <ul className="space-y-4">
          {places.map((place, i) => renderPlace(place, i))}
        </ul>
      )}
    </div>
  );
};

export default PlacesList;