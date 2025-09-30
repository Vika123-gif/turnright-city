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

    places.forEach((place, index) => {
      if (place.lat && place.lon) {
        // Create marker
        const marker = new mapboxgl.Marker({
          color: '#10B981'
        })
          .setLngLat([place.lon, place.lat])
          .setPopup(
            new mapboxgl.Popup()
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold text-sm">${place.name}</h3>
                  <p class="text-xs text-gray-600">${place.address}</p>
                  ${place.walkingTime ? `<p class="text-xs text-green-600 mt-1">${place.walkingTime}</p>` : ''}
                </div>
              `)
          )
          .addTo(map.current!);

        markers.push(marker);
        bounds.extend([place.lon, place.lat]);
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
    const waypoints = places
      .filter(place => place.lat && place.lon)
      .map(place => `${place.lat},${place.lon}`)
      .join('|');
    
    const baseUrl = 'https://www.google.com/maps/dir/';
    return `${baseUrl}${origin}/${waypoints}`;
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