import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { LLMPlace } from '@/hooks/useOpenAI';

type MapProps = {
  places: LLMPlace[];
  className?: string;
};

const Map: React.FC<MapProps> = ({ places, className = "" }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !places.length) return;

    // Initialize map with Mapbox token from environment
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
    
    // Calculate center point from places
    const validCoords = places.filter(place => place.coordinates || (place.lat && place.lon));
    if (validCoords.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    validCoords.forEach(place => {
      const [lng, lat] = place.coordinates || [place.lon!, place.lat!];
      bounds.extend([lng, lat]);
    });

    const center = bounds.getCenter();
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Add markers for each place
    places.forEach((place, index) => {
      const coords = place.coordinates || [place.lon!, place.lat!];
      if (!coords || coords.length !== 2) return;

      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'marker';
      markerEl.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMwMDg0NTciLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZmZmZiI+CjxwYXRoIGQ9Ik0xMiAyQzguMTMgMiA1IDUuMTMgNSA5YzAgNS4yNSA3IDEzIDcgMTNzNy03Ljc1IDctMTNjMC0zLjg3LTMuMTMtNy03LTd6TTEyIDExLjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41czEuMTItMi41IDIuNS0yLjUgMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIvPgo8L3N2Zz4KPC9zdmc+)';
      markerEl.style.width = '32px';
      markerEl.style.height = '32px';
      markerEl.style.backgroundSize = 'contain';
      markerEl.style.cursor = 'pointer';
      
      // Add number overlay
      const numberEl = document.createElement('div');
      numberEl.style.position = 'absolute';
      numberEl.style.top = '50%';
      numberEl.style.left = '50%';
      numberEl.style.transform = 'translate(-50%, -50%)';
      numberEl.style.color = 'white';
      numberEl.style.fontSize = '12px';
      numberEl.style.fontWeight = 'bold';
      numberEl.textContent = (index + 1).toString();
      markerEl.appendChild(numberEl);

      // Create popup content
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #008457;">${place.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">${place.address}</p>
          <p style="margin: 0; font-size: 12px; color: #888;">🚶 ${place.walkingTime} min walk</p>
          ${place.type ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #008457;">Type: ${place.type}</p>` : ''}
          ${place.reason ? `<p style="margin: 4px 0 0 0; font-size: 12px; font-style: italic;">${place.reason}</p>` : ''}
        </div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(popupContent);

      // Add marker to map
      new mapboxgl.Marker(markerEl)
        .setLngLat([coords[0], coords[1]])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Fit map to show all markers
    if (validCoords.length > 1) {
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [places]);

  if (!places.length) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground">No places to display on map</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
    </div>
  );
};

export default Map;