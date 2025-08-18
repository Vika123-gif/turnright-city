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

    // Initialize map with Mapbox token
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    console.log('Mapbox token:', mapboxToken?.substring(0, 10) + '...');
    console.log('Mapbox token available:', !!mapboxToken);
    
    if (!mapboxToken || mapboxToken === 'YOUR_MAPBOX_TOKEN_HERE') {
      console.error('Mapbox token not found or not properly configured');
      return;
    }
    
    mapboxgl.accessToken = mapboxToken;
    
    // Default Lisbon center coordinates
    const defaultCenter: [number, number] = [-9.1393, 38.7223]; // [lng, lat] for Mapbox
    
    console.log('Initializing map with places:', places);
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 13,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Add markers for each place using real coordinates or fallback to Lisbon center
    const fallbackCoords = { lat: 38.7223, lng: -9.1393 };

    places.forEach((place, index) => {
      // Use real coordinates if available, otherwise fallback to Lisbon center
      const coords = place.coordinates 
        ? { lat: place.coordinates[1], lng: place.coordinates[0] }
        : fallbackCoords;
      
      console.log(`Adding marker ${index + 1} for ${place.name} at`, coords);

      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'marker';
      markerEl.style.width = '32px';
      markerEl.style.height = '32px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = '#008457';
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
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Log that map was initialized
    console.log('Map initialized successfully with', places.length, 'places');

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

  // Show placeholder if no Mapbox token
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken || mapboxToken === 'YOUR_MAPBOX_TOKEN_HERE') {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted rounded-lg p-6 ${className}`}>
        <p className="text-muted-foreground mb-2">📍 Interactive Map</p>
        <p className="text-sm text-center text-muted-foreground">
          To enable the interactive map, please add your Mapbox access token.<br/>
          Get one free at <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
        </p>
        <div className="mt-4 p-4 bg-background rounded border">
          <p className="text-xs font-mono">VITE_MAPBOX_ACCESS_TOKEN=your_token_here</p>
        </div>
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