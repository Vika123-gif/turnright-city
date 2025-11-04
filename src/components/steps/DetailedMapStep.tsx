import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../Button";
import Map from "../Map";
import RouteFeedback from "../RouteFeedback";
import CategoryBadge from "../CategoryBadge";
import { MapPin, Clock, ExternalLink, Star } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { useComprehensiveTracking } from "@/hooks/useComprehensiveTracking";

type Props = {
  places: LLMPlace[];
  onBack: () => void;
  onReset: () => void;
  origin: string;
  destination?: string;
  destinationType?: 'none' | 'circle' | 'specific';
  onFeedbackSubmit?: (feedback: string) => void;
  scenario?: 'onsite' | 'planning';
  days?: number;
};

const DetailedMapStep: React.FC<Props> = ({
  places,
  onBack,
  onReset,
  origin,
  destination,
  destinationType = 'none',
  onFeedbackSubmit,
  scenario = 'onsite',
  days,
}) => {
  const navigate = useNavigate();
  const { trackButtonClick, trackRouteAction, trackPageView } = useComprehensiveTracking();
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isListOpen, setIsListOpen] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [startAddress, setStartAddress] = useState<string>("");
  const [endAddress, setEndAddress] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState(1);

  // Group places by day for planning scenario
  const placesByDay = scenario === 'planning' && days && days > 1 
    ? places.reduce((acc, place) => {
        const day = (place as any).day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(place);
        return acc;
      }, {} as Record<number, LLMPlace[]>)
    : { 1: places };

  const availableDays = Object.keys(placesByDay).map(Number).sort((a, b) => a - b);
  const currentDayPlaces = placesByDay[selectedDay] || [];
  
  // Debug logging for place distribution
  React.useEffect(() => {
    if (scenario === 'planning' && days && days > 1) {
      console.log('📅 Places distribution by day:', {
        totalPlaces: places.length,
        expectedDays: days,
        placesPerDay: Object.entries(placesByDay).map(([day, dayPlaces]) => ({
          day: Number(day),
          count: dayPlaces.length
        })),
        availableDays
      });
    }
  }, [places, days, scenario, placesByDay, availableDays]);

  // Track page view when component mounts
  React.useEffect(() => {
    trackPageView('/detailed-map', {
      placesCount: places.length,
      origin,
      destination,
      hasDestination: !!destination
    });
  }, [trackPageView, places.length, origin, destination]);

  // Reverse geocode Start/End if coordinates were provided
  React.useEffect(() => {
    const coordRegex = /^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/;

    const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
      try {
        const token = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN;
        if (!token) return `${lat.toFixed(5)},${lon.toFixed(5)}`;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?language=en&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return `${lat.toFixed(5)},${lon.toFixed(5)}`;
        const data = await res.json();
        const label = data?.features?.[0]?.place_name as string | undefined;
        return label || `${lat.toFixed(5)},${lon.toFixed(5)}`;
      } catch {
        return `${lat.toFixed(5)},${lon.toFixed(5)}`;
      }
    };

    // Origin
    const mStart = typeof origin === 'string' ? origin.trim().match(coordRegex) : null;
    if (mStart) {
      const lat = parseFloat(mStart[1]);
      const lon = parseFloat(mStart[2]);
      reverseGeocode(lat, lon).then(addr => setStartAddress(addr));
    } else if (typeof origin === 'string') {
      setStartAddress(origin);
    }

    // Destination
    if (destination && typeof destination === 'string') {
      const mEnd = destination.trim().match(coordRegex);
      if (mEnd) {
        const lat = parseFloat(mEnd[1]);
        const lon = parseFloat(mEnd[2]);
        reverseGeocode(lat, lon).then(addr => setEndAddress(addr));
      } else {
        setEndAddress(destination);
      }
    } else {
      setEndAddress("");
    }
  }, [origin, destination]);

  const handleSaveHtml = () => {
    console.log('💾 Save button clicked!');
    console.log('Current day places:', currentDayPlaces);
    console.log('Legs:', legs);
    console.log('First leg:', firstLeg);
    console.log('Arrivals:', arrivals);
    
    // Track save route action
    trackRouteAction('save', {
      placesCount: currentDayPlaces.length,
      origin,
      destination,
      routeName: "TurnRight Route"
    }, 'DetailedMapStep');

    const title = "TurnRight Route";
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Calculate total walking time
    const totalWalkingTime = legs.reduce((sum, leg) => sum + leg.walkMin, 0) + firstLeg.walkMin;
    const totalVisitTime = currentDayPlaces.reduce((sum, place) => sum + (place.visitDuration || 30), 0);
    
    // Generate place cards with images and descriptions
    const placeCards = currentDayPlaces.map((place, i) => {
      const photoUrl = Array.isArray(place.photoUrls) && place.photoUrls.length > 0 
        ? place.photoUrls[0] 
        : place.photoUrl;
      
      const description = place.description || 'A wonderful place to visit on your route';
      const rating = typeof place.rating === 'number' ? place.rating.toFixed(1) : 'N/A';
      const walkingTime = i === 0 ? firstLeg.walkMin : legs[i].walkMin;
      const arrivalTime = arrivals[i];
      
      return `
        <div class="place-card">
          <div class="place-image">
            ${photoUrl ? 
              `<img src="${photoUrl}" alt="${place.name}" style="width:100%; height:200px; object-fit:cover; border-radius:8px 8px 0 0;">` :
              `<div style="width:100%; height:200px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); display:flex; align-items:center; justify-content:center; color:white; font-size:24px; border-radius:8px 8px 0 0;">📍</div>`
            }
            <div class="place-number">${i + 1}</div>
          </div>
          <div class="place-content">
            <h3 class="place-name">${place.name}</h3>
            ${place.goalMatched ? `<div class="place-category">${place.goalMatched}</div>` : ''}
            <div class="place-rating">⭐ ${rating}</div>
            ${place.address ? `<p class="place-address">📍 ${place.address}</p>` : ''}
            <p class="place-description">${description}</p>
            <div class="place-info">
              <div class="info-item">🕐 Arrive: ${arrivalTime}</div>
              <div class="info-item">🚶 Walk: ${walkingTime} min</div>
              ${place.visitDuration ? `<div class="info-item">⏱️ Visit: ${place.visitDuration} min</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: 1.2em;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    
    .route-info {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    
    .info-badge {
      background: rgba(255,255,255,0.2);
      padding: 10px 20px;
      border-radius: 25px;
      font-size: 0.9em;
    }
    
    .content {
      padding: 40px;
    }
    
    .places-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 30px;
      margin-top: 30px;
    }
    
    .place-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .place-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(0,0,0,0.15);
    }
    
    .place-image {
      position: relative;
    }
    
    .place-number {
      position: absolute;
      top: 15px;
      left: 15px;
      background: rgba(102, 126, 234, 0.9);
      color: white;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.1em;
    }
    
    .place-content {
      padding: 25px;
    }
    
    .place-name {
      font-size: 1.4em;
      font-weight: 700;
      margin-bottom: 10px;
      color: #2d3748;
    }
    
    .place-category {
      display: inline-block;
      background: #e2e8f0;
      color: #4a5568;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 0.85em;
      margin-bottom: 10px;
    }
    
    .place-rating {
      font-size: 1.1em;
      color: #f6ad55;
      margin-bottom: 10px;
      font-weight: 600;
    }
    
    .place-address {
      color: #4a5568;
      font-size: 0.9em;
      margin-bottom: 12px;
      line-height: 1.4;
      font-style: italic;
    }
    
    .place-description {
      color: #718096;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    
    .place-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .info-item {
      font-size: 0.9em;
      color: #4a5568;
      padding: 5px 0;
    }
    
    .footer {
      background: #f7fafc;
      padding: 30px;
      text-align: center;
      color: #718096;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer .logo {
      font-size: 1.5em;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    
    @media (max-width: 768px) {
      .places-grid {
        grid-template-columns: 1fr;
      }
      
      .route-info {
        flex-direction: column;
        align-items: center;
      }
      
      .header h1 {
        font-size: 2em;
      }
      
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗺️ ${title}</h1>
      <div class="subtitle">Your personalized travel itinerary</div>
      <div class="route-info">
        <div class="info-badge">📍 ${origin || 'Starting point'}</div>
        <div class="info-badge">🚶 ${totalWalkingTime} min walking</div>
        <div class="info-badge">⏱️ ${totalVisitTime} min visiting</div>
        <div class="info-badge">📅 ${currentDate}</div>
      </div>
    </div>
    
    <div class="content">
      <h2 style="text-align: center; margin-bottom: 20px; color: #2d3748;">Your Route Stops</h2>
      <div class="places-grid">
        ${placeCards}
      </div>
    </div>
    
    <div class="footer">
      <div class="logo">TurnRight.city</div>
      <p>Generated on ${currentDate} • Your personal travel companion</p>
    </div>
  </div>
</body>
</html>`;

    try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turnright_route_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
      console.log('✅ Route saved successfully!');
    } catch (error) {
      console.error('❌ Error saving route:', error);
      alert('Failed to save route. Please try again.');
    }
  };

  const handleFeedbackSubmit = async (feedback: string) => {
    if (!onFeedbackSubmit) return;
    
    setIsSubmittingFeedback(true);
    try {
      await onFeedbackSubmit(feedback);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  // Create individual place Google Maps link
  const createPlaceLink = (place: LLMPlace): string => {
    // Priority: coordinates > address > name
    if (place.lat && place.lon) {
      return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
    }
    if (place.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
  };

  // Create full route Google Maps link
  const createRouteLink = (startLocation: string, destinations: LLMPlace[]): string => {
    console.log('Creating route link with:', { startLocation, destinations });
    
    if (!destinations.length) {
      console.log('No destinations found, returning default maps URL');
      return 'https://maps.google.com';
    }

    if (!startLocation) {
      console.log('No start location provided');
      return 'https://maps.google.com';
    }

    const originParam = encodeURIComponent(startLocation);
    
    // Get destination (last place) - prioritize name over coordinates for better display
    const lastPlace = destinations[destinations.length - 1];
    const destinationParam = encodeURIComponent(lastPlace.name || lastPlace.address || `${lastPlace.lat},${lastPlace.lon}`);

    console.log('Origin:', originParam, 'Destination:', destinationParam);

    // Get waypoints (all places except the last one) - use names for better display
    const waypoints = destinations.slice(0, -1).map(place => {
      return encodeURIComponent(place.name || place.address || `${place.lat},${place.lon}`);
    });

    console.log('Waypoints:', waypoints);

    let routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=walking`;
    
    if (waypoints.length > 0) {
      routeUrl += `&waypoints=${waypoints.join('|')}`;
    }

    console.log('Generated route URL:', routeUrl);
    return routeUrl;
  };

  // Haversine distance in km
  const haversineKm = (a: { lat?: number; lon?: number }, b: { lat?: number; lon?: number }) => {
    if (!a.lat || !a.lon || !b.lat || !b.lon) return null;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180;
    const la2 = b.lat * Math.PI / 180;
    const x = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2) ** 2;
    const d = 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
    return d;
  };

  // Build legs info: distance and walk minutes between consecutive places
  const legs = currentDayPlaces.map((p, i) => {
    if (i === 0) return { distanceKm: 0, walkMin: 0 };
    const km = haversineKm(currentDayPlaces[i-1], p) ?? 0;
    const walkMin = Math.round((km / 4.5) * 60); // ~4.5 km/h walking
    return { distanceKm: km, walkMin };
  });

  // First leg: from origin to first place (if origin are coordinates)
  let firstLeg = { distanceKm: 0, walkMin: 0 };
  if (currentDayPlaces.length > 0 && typeof origin === 'string') {
    const m = origin.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (m) {
      const o = { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
      const p0 = { lat: currentDayPlaces[0].lat, lon: currentDayPlaces[0].lon };
      const km0 = haversineKm(o, p0) ?? 0;
      const min0 = Math.round((km0 / 4.5) * 60);
      firstLeg = { distanceKm: km0, walkMin: isFinite(min0) ? min0 : 0 };
    }
  }

  // Last leg: from last place to destination (if destination exists)
  let lastLeg = { distanceKm: 0, walkMin: 0 };
  if (destination && currentDayPlaces.length > 0) {
    const m = destination.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (m) {
      const dest = { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
      const lastPlace = currentDayPlaces[currentDayPlaces.length - 1];
      const kmLast = haversineKm({ lat: lastPlace.lat, lon: lastPlace.lon }, dest) ?? 0;
      const minLast = Math.round((kmLast / 4.5) * 60);
      lastLeg = { distanceKm: kmLast, walkMin: isFinite(minLast) ? minLast : 0 };
    }
  }

  // Arrival times starting now
  const start = new Date();
  let accumMin = 0;
  const arrivals = currentDayPlaces.map((p, i) => {
    if (i === 0) {
      accumMin += firstLeg.walkMin; // include walk from origin to first POI when available
    } else {
      accumMin += legs[i].walkMin;
    }
    const dt = new Date(start.getTime() + accumMin * 60000);
    const hh = dt.getHours().toString().padStart(2, '0');
    const mm = dt.getMinutes().toString().padStart(2, '0');
    // Add visit duration for next leg timing
    accumMin += (p.visitDuration ?? 30);
    return `${hh}:${mm}`;
  });

  return (
    <div className="w-full flex flex-col text-left p-4 pb-48 overflow-y-auto" style={{ height: '100%', maxHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-3">
        <button 
          className="text-sm text-gray-600 hover:text-gray-800" 
          onClick={() => {
            trackButtonClick('back_button', '← Back', 'DetailedMapStep');
            onBack();
          }}
        >← Back</button>
        <div className="font-semibold text-lg flex items-center gap-2">🗺️ Your Route</div>
        <div />
      </div>

      {/* Collapsible list ABOVE the map */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-700">Stops</div>
          <div className="flex items-center gap-2">
            {/* Day switching buttons for planning scenario */}
            {scenario === 'planning' && availableDays.length > 1 && (
              <div className="flex gap-1">
                {availableDays.map(day => (
                  <button
                    key={day}
                    onClick={() => {
                      trackButtonClick('day_switch', `Day ${day}`, 'DetailedMapStep');
                      setSelectedDay(day);
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      selectedDay === day 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                trackButtonClick('toggle_list', isListOpen ? 'Hide list' : 'Show list', 'DetailedMapStep');
                setIsListOpen(v => !v);
              }}
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
            >{isListOpen ? 'Hide list' : 'Show list'}</button>
          </div>
        </div>
        {isListOpen && (
          <div className="bg-white border border-gray-200 rounded-lg max-h-[28vh] overflow-y-auto">
            {origin && (
              <div className="px-3 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="text-xs font-semibold w-6 text-gray-600">S</div>
                <div className="w-16 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">Start</div>
                  {/* Show coords if provided, and the resolved address */}
                  <div className="text-[11px] text-gray-500 truncate">
                    {(() => {
                      const m = origin?.trim?.().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
                      return m ? `${parseFloat(m[1]).toFixed(5)},${parseFloat(m[2]).toFixed(5)}` : '';
                    })()}
                  </div>
                  <div className="text-[11px] text-gray-600 truncate">{startAddress}</div>
                </div>
              </div>
            )}
            {currentDayPlaces.map((place, i) => (
              <div key={i} className="px-3 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="text-xs font-semibold w-6 text-gray-600">{i + 1}</div>
                <div className="w-16 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  {Array.isArray(place.photoUrls) && place.photoUrls.length > 0 ? (
                    <img src={place.photoUrls[0]} alt={place.name} className="w-full h-full object-cover" />
                  ) : place.photoUrl ? (
                    <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <div className="text-blue-600 text-lg">📍</div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-sm font-semibold break-words line-clamp-2 leading-tight">{place.name}</div>
                  {place.goalMatched && (
                    <div className="mt-0.5 mb-0.5">
                      <CategoryBadge category={place.goalMatched} size="sm" />
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500 space-y-0.5">
                    <div>{`Arrive ${arrivals[i]}`}{place.visitDuration ? ` · ⏱ ${place.visitDuration} min` : ''}</div>
                    <div>{i === 0 ? `🚶 ${firstLeg.walkMin} min from start · ${firstLeg.distanceKm.toFixed(2)} km` : `🚶 ${legs[i].walkMin} min from ${i} · ${legs[i].distanceKm.toFixed(2)} km`}</div>
                  </div>
                </div>
                <div className="hidden md:block flex-shrink-0">
                {(() => {
                  // Audio function for place descriptions
                  const speakPlaceDescription = (place: LLMPlace) => {
                    if ('speechSynthesis' in window) {
                      const utterance = new SpeechSynthesisUtterance();
                      utterance.text = `${place.name}. ${place.description || 'A wonderful place to visit on your route.'}`;
                      utterance.lang = 'en-US';
                      utterance.rate = 0.9;
                      utterance.pitch = 1;
                      utterance.volume = 0.8;
                      
                      // Cancel any ongoing speech
                      window.speechSynthesis.cancel();
                      window.speechSynthesis.speak(utterance);
                    }
                  };

                    return (
                      <button
                        onClick={() => {
                        trackButtonClick('audio_guide', '🔊 Audio Guide', 'DetailedMapStep', {
                            placeName: place.name,
                            placeIndex: i
                          });
                        speakPlaceDescription(place);
                      }}
                      className="text-[11px] px-2 py-1 rounded border hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      🔊 Audio Guide
                    </button>
                  );
                })()}
                </div>
              </div>
            ))}
            {destination && (
              <div className="px-3 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="text-xs font-semibold w-6 text-gray-600">E</div>
                <div className="w-16 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">End</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {(() => {
                      const m = destination?.trim?.().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
                      return m ? `${parseFloat(m[1]).toFixed(5)},${parseFloat(m[2]).toFixed(5)}` : '';
                    })()}
                  </div>
                  <div className="text-[11px] text-gray-600 truncate">{endAddress}</div>
                  {places.length > 0 && (
                    <div className="text-[11px] text-gray-500 mt-1">
                      🚶 {lastLeg.walkMin} min from {places.length} · {lastLeg.distanceKm.toFixed(2)} km
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <Map 
        places={currentDayPlaces} 
        origin={origin} 
        destinationType={destinationType} 
        destination={destination} 
        className="flex-1 min-h-0 w-full rounded-lg border-2 border-primary/20 shadow-lg"
      />

      {/* Action bar */}
      <div className="mt-3 flex gap-2 flex-shrink-0">
        <button 
          className="flex-1 bg-primary text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-primary/90" 
          onClick={handleSaveHtml}
        >💾 Save</button>
        <button 
          className="flex-1 border px-3 py-2 rounded-md text-xs hover:bg-gray-50" 
          onClick={() => {
            trackButtonClick('leave_comment', 'Leave a comment', 'DetailedMapStep');
            setShowCommentModal(true);
          }}
        >💬 Comment</button>
        <button 
          className="flex-1 border px-3 py-2 rounded-md text-xs hover:bg-gray-50" 
          onClick={() => {
            trackButtonClick('start_chat_again', 'Start chat again', 'DetailedMapStep');
            onReset();
          }}
        >🔄 New route</button>
      </div>

      {/* Detailed Places List removed from below map to keep UI clean */}
      <div className="hidden">
        {currentDayPlaces.map((place, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Place Image with Overlay */}
            <div className="relative">
              {Array.isArray(place.photoUrls) && place.photoUrls.length > 0 ? (
                <div className="w-full h-40 overflow-hidden relative">
                  <PlacePhotoCarousel urls={place.photoUrls} alt={place.name} />
                </div>
              ) : place.photoUrl ? (
                <div className="w-full h-40 overflow-hidden">
                  <img 
                    src={place.photoUrl} 
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
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
              
              {/* Category Badge */}
              {place.goalMatched && (
                <div className="mb-3">
                  <CategoryBadge 
                    category={place.goalMatched} 
                    size="md" 
                    showCoolScore={true}
                    coolScore={place.coolScore || 0}
                  />
                </div>
              )}
              
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
                  href={createPlaceLink(place)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
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
      
      {/* Removed route navigation block */}
      

      {/* Comment modal */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCommentModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg p-4 w-[92vw] max-w-md border">
            <div className="font-semibold mb-1">Leave a comment</div>
            <div className="text-sm text-gray-600 mb-3">We really want to know if you liked the route and what you'd like to add!</div>
            <textarea className="w-full h-28 border rounded p-2 text-sm" placeholder="Your feedback..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
            <div className="flex justify-end gap-2 mt-3">
              <button 
                className="px-3 py-1.5 rounded-md border text-sm" 
                onClick={() => {
                  trackButtonClick('comment_cancel', 'Cancel', 'DetailedMapStep');
                  setShowCommentModal(false);
                }}
              >Cancel</button>
              <button 
                className="px-3 py-1.5 rounded-md bg-primary text-white text-sm" 
                onClick={() => { 
                  trackRouteAction('comment', { 
                    commentText: commentText,
                    commentLength: commentText.length,
                    hasComment: commentText.trim().length > 0
                  }, 'DetailedMapStep');
                  onFeedbackSubmit?.(commentText); 
                  setShowCommentModal(false); 
                }}
              >Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedMapStep;

function PlacePhotoCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [idx, setIdx] = React.useState(0);
  if (!urls.length) return null;
  const next = () => setIdx((i) => (i + 1) % urls.length);
  const prev = () => setIdx((i) => (i - 1 + urls.length) % urls.length);
  return (
    <div className="relative w-full h-40">
      <img src={urls[idx]} alt={alt} className="w-full h-full object-cover" />
      {urls.length > 1 && (
        <>
          <button
            aria-label="Prev photo"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ‹
          </button>
          <button
            aria-label="Next photo"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ›
          </button>
          <div className="absolute bottom-1 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
            {idx + 1}/{urls.length}
          </div>
        </>
      )}
    </div>
  );
}