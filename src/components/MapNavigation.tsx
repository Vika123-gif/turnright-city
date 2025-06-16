
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LLMPlace } from '@/hooks/useOpenAI';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMwMEJDNzIiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destinationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDljMCA1LjI1IDcgMTMgNyAxM3M3LTcuNzUgNy0xM2MwLTMuODctMy4xMy03LTctN3ptMCA5LjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41czEuMTItMi41IDIuNS0yLjUgMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIgZmlsbD0iI0ZGNTc1NyIvPgo8L3N2Zz4=',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

type Props = {
  origin: string;
  places: LLMPlace[];
  onClose: () => void;
};

function LocationUpdater({ userPosition }: { userPosition: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (userPosition) {
      map.setView(userPosition, 16);
    }
  }, [userPosition, map]);
  
  return null;
}

const MapNavigation: React.FC<Props> = ({ origin, places, onClose }) => {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Parse origin coordinates
  const originCoords = React.useMemo(() => {
    if (origin.includes(',')) {
      const [lat, lng] = origin.split(',').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng] as [number, number];
      }
    }
    return null;
  }, [origin]);

  // Get coordinates for places (simplified - in real app you'd geocode addresses)
  const placeCoordinates = React.useMemo(() => {
    if (!originCoords) return [];
    
    return places.map((place, index) => {
      // Simple offset for demo - in real app you'd geocode the addresses
      const latOffset = (index + 1) * 0.002;
      const lngOffset = (index + 1) * 0.002;
      return [originCoords[0] + latOffset, originCoords[1] + lngOffset] as [number, number];
    });
  }, [places, originCoords]);

  useEffect(() => {
    if (originCoords && placeCoordinates.length > 0) {
      setRouteCoordinates([originCoords, ...placeCoordinates]);
    }
  }, [originCoords, placeCoordinates]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition([latitude, longitude]);
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (!originCoords) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">Invalid origin coordinates</p>
        <button
          onClick={onClose}
          className="bg-[#00BC72] text-white px-4 py-2 rounded-lg"
        >
          Close Map
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`px-3 py-2 rounded-lg text-white font-medium ${
            isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00BC72] hover:bg-[#00965c]'
          }`}
        >
          {isTracking ? '⏹️ Stop Tracking' : '📍 Start Tracking'}
        </button>
        <button
          onClick={onClose}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg font-medium"
        >
          ✕ Close Map
        </button>
      </div>

      {error && (
        <div className="absolute top-4 right-4 z-[1000] bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <MapContainer
        center={originCoords}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userPosition && <LocationUpdater userPosition={userPosition} />}
        
        {/* Route line */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#00BC72"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Origin marker */}
        <Marker position={originCoords} icon={userIcon}>
          <Popup>
            <div className="text-center">
              <strong>Start Location</strong>
              <br />
              Your journey begins here
            </div>
          </Popup>
        </Marker>

        {/* User's current position */}
        {userPosition && (
          <Marker position={userPosition} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <strong>You are here</strong>
                <br />
                Current location
              </div>
            </Popup>
          </Marker>
        )}

        {/* Place markers */}
        {placeCoordinates.map((coord, index) => (
          <Marker key={index} position={coord} icon={destinationIcon}>
            <Popup>
              <div className="max-w-xs">
                <strong>{places[index].name}</strong>
                <br />
                <span className="text-sm text-gray-600">{places[index].address}</span>
                <br />
                <span className="text-xs text-green-600">
                  🚶 {places[index].walkingTime} min walk
                </span>
                {places[index].reason && (
                  <div className="text-xs mt-1 text-blue-600">
                    {places[index].reason}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapNavigation;
