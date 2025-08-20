import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { LLMPlace } from '@/hooks/useOpenAI';
import { useGeolocation } from '@/hooks/useGeolocation';

type MapProps = {
  places: LLMPlace[];
  className?: string;
  origin?: string;
};

const Map: React.FC<MapProps> = ({ places, className = "", origin }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [routeCreated, setRouteCreated] = useState(false);
  
  // Track user's real-time location
  const { coordinates: userLocation, error: locationError } = useGeolocation();

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

    // Create route line and add markers
    const createRouteAndMarkers = async () => {
      const fallbackCoords = { lat: 38.7223, lng: -9.1393 };
      const routeCoordinates: [number, number][] = [];

      // Add origin location as start point
      let originCoords = null;
      if (origin) {
        console.log('Processing origin:', origin);
        
        // Check if origin is coordinates (lat,lng format)
        const coordMatch = origin.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lng = parseFloat(coordMatch[2]);
          originCoords = { lat, lng };
          console.log('Origin is coordinates:', originCoords);
        } else {
          // Origin is a location name, try to geocode it
          try {
            console.log('Geocoding origin location:', origin);
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origin)}&format=json&limit=1&accept-language=en`
            );
            const data = await response.json();
            if (data.length > 0) {
              originCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
              console.log('Geocoded origin to:', originCoords);
            }
          } catch (error) {
            console.error('Error geocoding origin:', error);
          }
        }
      }

      // Use origin coordinates or user location as start point
      const startCoords = originCoords || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null);
      if (startCoords) {
        routeCoordinates.push([startCoords.lng, startCoords.lat]);
        console.log('Added start point to route:', startCoords);
        
        // Add origin marker
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

        const originPopup = new mapboxgl.Popup({ offset: 15 }).setHTML(
          `<div style="padding: 8px;"><strong>Start: ${origin || 'Your Location'}</strong></div>`
        );

        new mapboxgl.Marker(originMarkerEl)
          .setLngLat([startCoords.lng, startCoords.lat])
          .setPopup(originPopup)
          .addTo(map.current!);
      }

      // Add markers for each place and collect coordinates for route
      places.forEach((place, index) => {
        const coords = place.coordinates 
          ? { lat: place.coordinates[1], lng: place.coordinates[0] }
          : fallbackCoords;
        
        console.log(`Adding marker ${index + 1} for ${place.name} at`, coords);
        routeCoordinates.push([coords.lng, coords.lat]);

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
          <div style="padding: 8px; min-width: 200px; max-width: 300px;">
            ${place.photoUrl ? `<img src="${place.photoUrl}" alt="${place.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" onerror="this.style.display='none'">` : ''}
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

      // Add route line if we have coordinates
      if (routeCoordinates.length > 1 && !routeCreated) {
        // Try to get walking route from Mapbox Directions API
        const getWalkingRoute = async () => {
          try {
            // Build Directions API request URL
            const coordinates = routeCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
            const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&overview=full&steps=true&access_token=${mapboxToken}`;
            
            console.log('Fetching walking route from Mapbox Directions API...');
            const response = await fetch(directionsUrl);
            
            if (!response.ok) {
              throw new Error(`Directions API failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              console.log('Successfully fetched walking route from Directions API');
              
              // Add route source with Directions API geometry
              map.current!.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: route.geometry
                }
              });

              // Add route layer with enhanced styling
              map.current!.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': '#008457',
                  'line-width': 5,
                  'line-opacity': 0.9
                }
              });

              // Fit map to route bounds with padding
              if (route.geometry && route.geometry.coordinates) {
                const bounds = new mapboxgl.LngLatBounds();
                route.geometry.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
                map.current!.fitBounds(bounds, { padding: 80 });
              }
              
              return true; // Success
            } else {
              throw new Error('No routes found in API response');
            }
          } catch (error) {
            console.warn('Mapbox Directions API failed, falling back to simple route:', error);
            return false; // Failed
          }
        };

        map.current!.on('load', async () => {
          if (!map.current!.getSource('route')) {
            // Try Directions API first
            const directionsSuccess = await getWalkingRoute();
            
            // Fallback: simple LineString if Directions API fails
            if (!directionsSuccess) {
              console.log('Using fallback: simple LineString route');
              
              // Add simple route source (fallback)
              map.current!.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: routeCoordinates
                  }
                }
              });

              // Add simple route layer (fallback)
              map.current!.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': '#008457',
                  'line-width': 4,
                  'line-opacity': 0.8
                }
              });
              
              // Fit map to show all points (fallback)
              const bounds = new mapboxgl.LngLatBounds();
              routeCoordinates.forEach(coord => bounds.extend(coord));
              map.current!.fitBounds(bounds, { padding: 50 });
            }
          }
        });
        setRouteCreated(true);
      }
    };

    // Initialize the route and markers
    createRouteAndMarkers().catch(console.error);

    // Log that map was initialized
    console.log('Map initialized successfully with', places.length, 'places');

    // Cleanup
    return () => {
      map.current?.remove();
      userMarker.current?.remove();
    };
  }, [places, routeCreated, origin]);

  // Update user location marker when position changes
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // Remove existing user marker
    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Create user location marker
    const userMarkerEl = document.createElement('div');
    userMarkerEl.style.width = '20px';
    userMarkerEl.style.height = '20px';
    userMarkerEl.style.borderRadius = '50%';
    userMarkerEl.style.backgroundColor = '#3B82F6';
    userMarkerEl.style.border = '3px solid white';
    userMarkerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    userMarkerEl.style.position = 'relative';

    // Add pulsing animation
    const pulseEl = document.createElement('div');
    pulseEl.style.width = '20px';
    pulseEl.style.height = '20px';
    pulseEl.style.borderRadius = '50%';
    pulseEl.style.backgroundColor = '#3B82F6';
    pulseEl.style.position = 'absolute';
    pulseEl.style.top = '0';
    pulseEl.style.left = '0';
    pulseEl.style.animation = 'pulse 2s infinite';
    pulseEl.style.opacity = '0.5';
    userMarkerEl.appendChild(pulseEl);

    // Add CSS for pulse animation
    if (!document.getElementById('user-marker-styles')) {
      const style = document.createElement('style');
      style.id = 'user-marker-styles';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 0.2; }
          100% { transform: scale(1); opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }

    // Create user marker
    userMarker.current = new mapboxgl.Marker(userMarkerEl)
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(
        '<div style="padding: 8px;"><strong>Your Location</strong></div>'
      ))
      .addTo(map.current);

    // Update route if it exists
    if (map.current.getSource('route')) {
      const routeCoordinates: [number, number][] = [[userLocation.lng, userLocation.lat]];
      
      // Add place coordinates
      places.forEach(place => {
        if (place.coordinates) {
          routeCoordinates.push([place.coordinates[0], place.coordinates[1]]);
        }
      });

      // Update route source
      (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates
        }
      });
    }

    console.log('User location updated:', userLocation);
  }, [userLocation, places]);

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
      {locationError && (
        <div className="absolute top-4 left-4 bg-background border rounded-lg p-2 shadow-lg">
          <p className="text-sm text-muted-foreground">📍 Location: {locationError}</p>
        </div>
      )}
      {userLocation && (
        <div className="absolute top-4 right-4 bg-background border rounded-lg p-2 shadow-lg">
          <p className="text-sm text-muted-foreground">📍 Tracking your location</p>
        </div>
      )}
    </div>
  );
};

export default Map;