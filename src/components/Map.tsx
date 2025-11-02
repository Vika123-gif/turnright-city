import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { LLMPlace } from '@/hooks/useOpenAI';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Maximize2, X } from 'lucide-react';

type MapProps = {
  places: LLMPlace[];
  className?: string;
  origin?: string;
  destinationType?: 'none' | 'circle' | 'specific';
  destination?: string;
};

const Map: React.FC<MapProps> = ({ places, className = "", origin, destinationType = 'none', destination }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [routeCreated, setRouteCreated] = useState(false);
  const [isDirectionsRoute, setIsDirectionsRoute] = useState(false); // Track if route was created with Directions API
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track user's real-time location
  const { coordinates: userLocation, error: locationError } = useGeolocation();

  useEffect(() => {
    if (!mapContainer.current || !places.length) return;

    // Reset route creation state when map is recreated
    setRouteCreated(false);
    setIsDirectionsRoute(false);

    // Initialize map with Mapbox token
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    console.log('Mapbox token:', mapboxToken?.substring(0, 10) + '...');
    console.log('Mapbox token available:', !!mapboxToken);
    
    if (!mapboxToken || mapboxToken === 'YOUR_MAPBOX_TOKEN_HERE') {
      console.error('Mapbox token not found or not properly configured');
      return;
    }
    
    mapboxgl.accessToken = mapboxToken;
    
    // Default Lisbon center coordinates (fallback)
    const defaultCenter: [number, number] = [-9.1393, 38.7223]; // [lng, lat] for Mapbox
    
    // Calculate center from places or use origin
    let mapCenter: [number, number] = defaultCenter;
    
    if (places.length > 0) {
      // Use the first place as the center
      const firstPlace = places[0];
      if (firstPlace.lat && firstPlace.lon) {
        mapCenter = [firstPlace.lon, firstPlace.lat]; // Mapbox uses [lng, lat]
        console.log('Centering map on first place:', firstPlace.name, mapCenter);
      }
    } else if (origin) {
      // Try to parse origin coordinates
      const coordMatch = origin.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        mapCenter = [lng, lat];
        console.log('Centering map on origin coordinates:', mapCenter);
      }
    }
    
    console.log('Map center:', mapCenter);
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: mapCenter,
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
        const coords = (place.lat && place.lon) 
          ? { lat: place.lat, lng: place.lon }
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

        // Create popup content with audio button
        const popupContent = `
          <div style="padding: 8px; min-width: 200px; max-width: 250px;">
            ${place.photoUrl ? `<img src="${place.photoUrl}" alt="${place.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" onerror="this.style.display='none'">` : 
              `<div style="width: 100%; height: 120px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center;">
                <div style="color: #3b82f6; font-size: 24px;">📍</div>
              </div>`}
            <h3 style="margin: 0; font-weight: bold; color: #008457; font-size: 16px; text-align: center;">${place.name}</h3>
            ${place.visitDuration ? `<div style="margin-top: 6px; text-align: center; color: #6b7280; font-size: 14px;">⏱️ ${place.visitDuration} min at location</div>` : ''}
            
            <!-- Audio button -->
            <div style="margin-top: 8px; text-align: center;">
              <button 
                onclick="
                  if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance();
                    utterance.text = '${place.name.replace(/'/g, "\\'")}. ${(place.description || 'A wonderful place to visit on your route.').replace(/'/g, "\\'")}';
                    utterance.lang = 'en-US';
                    utterance.rate = 0.9;
                    utterance.pitch = 1;
                    utterance.volume = 0.8;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                  }
                "
                style="
                  background: linear-gradient(135deg, #008457 0%, #00a86b 100%);
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                "
                onmouseover="this.style.transform='scale(1.05)'"
                onmouseout="this.style.transform='scale(1)'"
              >
                🔊 Audio Guide
              </button>
            </div>
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

      // Add End marker if destination is specified and different from origin
      if (destinationType === 'specific' && destination) {
        console.log('Processing destination:', destination);
        
        let destCoords = null;
        // Check if destination is coordinates (lat,lng format)
        const coordMatch = destination.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lng = parseFloat(coordMatch[2]);
          destCoords = { lat, lng };
          console.log('Destination is coordinates:', destCoords);
        } else {
          // Destination is a location name, try to geocode it with multiple attempts
          try {
            console.log('Geocoding destination location:', destination);
            
            // First try with the exact name
            let response = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1&accept-language=en&countrycodes=pl`
            );
            let data = await response.json();
            
            // If not found, try with Warsaw, Poland context
            if (data.length === 0) {
              console.log('Not found, trying with Warsaw context...');
              response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination + ', Warsaw, Poland')}&format=json&limit=1&accept-language=en`
              );
              data = await response.json();
            }
            
            // If still not found, try with Poland context
            if (data.length === 0) {
              console.log('Still not found, trying with Poland context...');
              response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination + ', Poland')}&format=json&limit=1&accept-language=en`
              );
              data = await response.json();
            }
            
            if (data.length > 0) {
              destCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
              console.log('Geocoded destination to:', destCoords);
              console.log('Geocoding result:', data[0]);
            } else {
              // Fallback for known Warsaw landmarks
              const knownLandmarks: { [key: string]: { lat: number; lng: number } } = {
                'palace of culture and science': { lat: 52.2319, lng: 21.0067 },
                'pałac kultury i nauki': { lat: 52.2319, lng: 21.0067 },
                'warsaw old town': { lat: 52.2297, lng: 21.0122 },
                'stare miasto': { lat: 52.2297, lng: 21.0122 },
                'royal castle': { lat: 52.2477, lng: 21.0139 },
                'zamek królewski': { lat: 52.2477, lng: 21.0139 }
              };
              
              const lowerDestination = destination.toLowerCase();
              if (knownLandmarks[lowerDestination]) {
                destCoords = knownLandmarks[lowerDestination];
                console.log('Using known landmark coordinates:', destCoords);
              } else {
                console.warn('Could not geocode destination:', destination);
              }
            }
          } catch (error) {
            console.error('Error geocoding destination:', error);
          }
        }

        if (destCoords) {
          // Add destination marker
          const destMarkerEl = document.createElement('div');
          destMarkerEl.style.width = '24px';
          destMarkerEl.style.height = '24px';
          destMarkerEl.style.borderRadius = '50%';
          destMarkerEl.style.backgroundColor = '#DC2626'; // Red color for end
          destMarkerEl.style.border = '3px solid white';
          destMarkerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          destMarkerEl.style.display = 'flex';
          destMarkerEl.style.alignItems = 'center';
          destMarkerEl.style.justifyContent = 'center';
          
          const endIcon = document.createElement('div');
          endIcon.style.color = 'white';
          endIcon.style.fontSize = '10px';
          endIcon.style.fontWeight = 'bold';
          endIcon.textContent = 'E';
          destMarkerEl.appendChild(endIcon);

          const destPopup = new mapboxgl.Popup({ offset: 15 }).setHTML(
            `<div style="padding: 8px;"><strong>End: ${destination}</strong></div>`
          );

          new mapboxgl.Marker(destMarkerEl)
            .setLngLat([destCoords.lng, destCoords.lat])
            .setPopup(destPopup)
            .addTo(map.current!);
          
          console.log('Added End marker at:', destCoords);
        }
      }

      // Fit map to show all markers if we have multiple places
      if (places.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        
        // Add all place coordinates to bounds
        places.forEach(place => {
          if (place.lat && place.lon) {
            bounds.extend([place.lon, place.lat]);
          }
        });
        
        // Add origin if available
        if (originCoords) {
          bounds.extend([originCoords.lng, originCoords.lat]);
        }
        
        // Add destination if available
        if (destinationType === 'specific' && destination) {
          const coordMatch = destination.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
          if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            bounds.extend([lng, lat]);
          }
        }
        
        // Only fit bounds if we have at least 2 points
        if (bounds.getNorth() !== bounds.getSouth() || bounds.getEast() !== bounds.getWest()) {
          map.current!.fitBounds(bounds, { padding: 80 });
          console.log('Fitted map to show all markers');
        }
      }

      // Add route line if we have coordinates
      if (routeCoordinates.length > 1) {
        console.log('=== ROUTE DEBUG ===');
        console.log('Route coordinates to render:', routeCoordinates);
        console.log('Route coordinates count:', routeCoordinates.length);
        
        // Try to get walking route from Mapbox Directions API
        const getWalkingRoute = async () => {
          try {
            // Create coordinates array for API
            let apiCoordinates = [...routeCoordinates];
            
            // For circular routes, we'll handle the return differently
            if (destinationType === 'circle' && startCoords && routeCoordinates.length > 1) {
              // Don't add the start point here - we'll handle it in the API call differently
              console.log('Preparing circular route coordinates');
            }
            
            // Build Directions API request URL
            const coordinates = apiCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
            const isCircular = destinationType === 'circle';
            
            // For circular routes, add the start point at the end to create a loop
            const finalCoordinates = isCircular && startCoords 
              ? `${coordinates};${startCoords.lng},${startCoords.lat}`
              : coordinates;
              
            const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${finalCoordinates}?geometries=geojson&overview=full&steps=true&annotations=duration,distance&roundabout_exits=false&access_token=${mapboxToken}`;
            
            console.log('Mapbox Directions API URL:', directionsUrl);
            console.log('Fetching walking route from Mapbox Directions API...');
            
            const response = await fetch(directionsUrl);
            console.log('Directions API Response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Directions API error response:', errorText);
              throw new Error(`Directions API failed: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Directions API Response data:', data);
            
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              console.log('Successfully fetched walking route from Directions API');
              console.log('Route geometry:', route.geometry);
              
              // Add route source with Directions API geometry
              map.current!.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: route.geometry
                }
              });
              console.log('Added route source to map');

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
                  'line-color': '#FF6B6B',
                  'line-width': 6,
                  'line-opacity': 0.9
                }
              });
              console.log('Added route layer to map');

              // Fit map to route bounds with padding
              if (route.geometry && route.geometry.coordinates) {
                const bounds = new mapboxgl.LngLatBounds();
                route.geometry.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
                map.current!.fitBounds(bounds, { padding: 80 });
                console.log('Fitted map to route bounds');
              }
              
              setIsDirectionsRoute(true); // Mark that we have a Directions API route
              console.log('✅ Directions API route created - will not be overwritten');
              
              
              return true; // Success
            } else {
              console.error('No routes found in API response:', data);
              throw new Error('No routes found in API response');
            }
          } catch (error) {
            console.error('Mapbox Directions API failed, falling back to simple route:', error);
            return false; // Failed
          }
        };

        // Wait for map to be fully loaded, then only use Directions API (no fallback straight lines)
        const createOnlyDirections = async () => {
          const tryCreate = async () => {
            if (map.current!.isStyleLoaded()) {
              await getWalkingRoute();
            } else {
              map.current!.once('load', async () => {
                await getWalkingRoute();
              });
            }
          };
          await tryCreate();
        };
        await createOnlyDirections();
        
        setRouteCreated(true);
        console.log('=== END ROUTE DEBUG ===');
      } else {
        console.log('Route creation skipped - not enough coordinates:', {
          coordinatesLength: routeCoordinates.length
        });
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
  }, [places, origin]);

  // Update user location marker when position changes
  useEffect(() => {
    if (!map.current || !userLocation) return;
    
    // Don't update route if it was created with Directions API (to preserve street routing)
    if (isDirectionsRoute) {
      console.log('⚠️ Skipping route update - preserving Directions API route');
    }

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

    // Update route if it exists (but only if it's NOT a Directions API route)
    if (map.current.getSource('route') && !isDirectionsRoute) {
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
  }, [userLocation, places, isDirectionsRoute]);

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
    <>
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
        
        {/* Map controls overlay */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-lg transition-colors"
            title="Expand map to fullscreen"
          >
            <Maximize2 className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        
        {locationError && (
          <div className="absolute top-4 left-4 bg-background border rounded-lg p-2 shadow-lg">
            <p className="text-sm text-muted-foreground">📍 Location: {locationError}</p>
          </div>
        )}
        {userLocation && (
          <div className="absolute top-4 left-4 bg-background border rounded-lg p-2 shadow-lg">
            <p className="text-sm text-muted-foreground">📍 Tracking your location</p>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full w-full">
            <Map places={places} origin={origin} destinationType={destinationType} destination={destination} className="h-full" />
            
            {/* Close button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white p-3 rounded-lg shadow-lg transition-colors z-10"
              title="Close fullscreen"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
            
            {/* Fullscreen indicator */}
            <div className="absolute top-4 left-4 bg-white/90 px-3 py-2 rounded-lg shadow-lg">
              <p className="text-sm font-medium text-gray-700">🗺️ Fullscreen Map</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Map;