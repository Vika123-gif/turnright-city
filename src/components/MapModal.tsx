import React, { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { type LLMPlace } from '@/hooks/useOpenAI';
import { useAnalytics } from '@/hooks/useAnalytics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  places: LLMPlace[];
  origin: string;
}

const MapModal: React.FC<Props> = ({ isOpen, onClose, places, origin }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { trackButtonClick } = useAnalytics();

  useEffect(() => {
    if (!isOpen || !mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = 'pk.eyJ1IjoidHVybnJpZ2h0Y2l0eSIsImEiOiJjbGp6cTNxZ20wNzNjM3JtcG0zN2d3NDJhIn0.L_Kq4KBsJ1dFfPWqvBPcpQ';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      zoom: 13,
      center: [-0.1276, 51.5074] // Default to London, will be updated
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Create markers for all places
    const markers: mapboxgl.Marker[] = [];
    const bounds = new mapboxgl.LngLatBounds();

    // Add origin marker (start point) if available
    const addOriginMarker = async () => {
      if (!origin) return;

      let originCoords = null;

      // Check if origin is coordinates (lat,lng format)
      const coordMatch = origin.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        originCoords = { lat, lng };
      } else {
        // Origin is a location name, try to geocode it
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origin)}&format=json&limit=1&accept-language=en`
          );
          const data = await response.json();
          if (data.length > 0) {
            originCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          }
        } catch (error) {
          console.error('Error geocoding origin:', error);
        }
      }

      if (originCoords) {
        // Create custom origin marker element (blue)
        const originMarkerEl = document.createElement('div');
        originMarkerEl.style.width = '24px';
        originMarkerEl.style.height = '24px';
        originMarkerEl.style.borderRadius = '50%';
        originMarkerEl.style.backgroundColor = '#3B82F6';
        originMarkerEl.style.border = '3px solid white';
        originMarkerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        originMarkerEl.style.display = 'flex';
        originMarkerEl.style.alignItems = 'center';
        originMarkerEl.style.justifyContent = 'center';
        
        const startIcon = document.createElement('div');
        startIcon.style.color = 'white';
        startIcon.style.fontSize = '10px';
        startIcon.style.fontWeight = 'bold';
        startIcon.textContent = '●';
        originMarkerEl.appendChild(startIcon);

        const originMarker = new mapboxgl.Marker(originMarkerEl)
          .setLngLat([originCoords.lng, originCoords.lat])
          .setPopup(
            new mapboxgl.Popup()
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold text-sm text-blue-600">Start Point</h3>
                  <p class="text-xs text-gray-600">${origin}</p>
                </div>
              `)
          )
          .addTo(map.current!);

        markers.push(originMarker);
        bounds.extend([originCoords.lng, originCoords.lat]);
      }
    };

    // Add places markers with numbers
    places.forEach((place, index) => {
      if (place.lat && place.lon) {
        // Create custom marker element with number
        const markerEl = document.createElement('div');
        markerEl.style.width = '32px';
        markerEl.style.height = '32px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#10B981';
        markerEl.style.border = '3px solid white';
        markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        markerEl.style.cursor = 'pointer';
        markerEl.style.display = 'flex';
        markerEl.style.alignItems = 'center';
        markerEl.style.justifyContent = 'center';
        
        // Add number overlay
        const numberEl = document.createElement('div');
        numberEl.style.color = 'white';
        numberEl.style.fontSize = '12px';
        numberEl.style.fontWeight = 'bold';
        numberEl.textContent = (index + 1).toString();
        markerEl.appendChild(numberEl);

        const isLastPlace = index === places.length - 1;
        
        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([place.lon, place.lat])
          .setPopup(
            new mapboxgl.Popup()
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold text-sm">${isLastPlace ? '🏁 ' : ''}${place.name}</h3>
                  <p class="text-xs text-gray-600">${place.address}</p>
                  ${place.walkingTime ? `<p class="text-xs text-green-600 mt-1">🚶 ${place.walkingTime}</p>` : ''}
                  ${isLastPlace ? '<p class="text-xs text-blue-600 mt-1">End Point</p>' : ''}
                </div>
              `)
          )
          .addTo(map.current!);

        markers.push(marker);
        bounds.extend([place.lon, place.lat]);
      }
    });

    // Add origin marker and then fit bounds
    addOriginMarker().then(() => {
      // Fit map to show all markers
      if (markers.length > 0) {
        map.current!.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
      }
    });

    // Fit map to show all markers
    if (markers.length > 0) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }

    // Cleanup function
    return () => {
      markers.forEach(marker => marker.remove());
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, places]);

  const generateGoogleMapsUrl = () => {
    if (!places.length) return 'https://maps.google.com';
    
    const originParam = encodeURIComponent(origin);
    
    // Last place is the destination
    const lastPlace = places[places.length - 1];
    const destinationParam = lastPlace.lat && lastPlace.lon 
      ? `${lastPlace.lat},${lastPlace.lon}`
      : encodeURIComponent(lastPlace.address || lastPlace.name);
    
    // All other places are waypoints
    const waypoints = places.slice(0, -1)
      .filter(place => place.lat && place.lon)
      .map(place => `${place.lat},${place.lon}`)
      .join('|');
    
    let routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=walking`;
    
    if (waypoints.length > 0) {
      routeUrl += `&waypoints=${waypoints}`;
    }
    
    return routeUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Route Map</h2>
          <div className="flex items-center gap-2">
            <a
              href={generateGoogleMapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackButtonClick("click_open_in_google_maps", "Open in Google Maps")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0 rounded-b-2xl" />
        </div>

        {/* Places List */}
        <div className="p-4 border-t border-gray-200 max-h-32 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Route Stops:</h3>
          <div className="flex flex-wrap gap-2">
            {places.map((place, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"
              >
                {place.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;