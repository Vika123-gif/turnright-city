import React, { useState, useEffect } from "react";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDatabase } from "@/hooks/useDatabase";
import { createClient } from "@supabase/supabase-js";
import BackButton from "./BackButton";
import ChatBot from "./ChatBot";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import DetailedMapStep from "./steps/DetailedMapStep";
import RouteRating from "./RouteRating";

// HARDCODED SUPABASE CREDENTIALS FOR TESTING ONLY
const supabaseUrl = "https://gwwqfoplhhtyjkrhazbt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3d3Fmb3BsaGh0eWprcmhhemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDU5OTQsImV4cCI6MjA2NTU4MTk5NH0.fgFpmEdc3swzKw0xlGYt68a9vM9J2F3fKdT413UNoPk";

type Step =
  | "chat"
  | "generating"
  | "results"
  | "purchase"
  | "detailed-map";

export default function ChatFlow() {
  const [step, setStep] = useState<Step>("chat");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState(""); // Store coordinates separately for map
  const [timeWindow, setTimeWindow] = useState<number | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [routeRating, setRouteRating] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [purchaseRoute, setPurchaseRoute] = useState<{ origin: string; places: LLMPlace[] } | null>(null);
  const [userSessionId, setUserSessionId] = useState<string>("");
  const [currentRouteGenerationId, setCurrentRouteGenerationId] = useState<string | null>(null);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [chatVisible, setChatVisible] = useState(true);
  const [isRouteGenerated, setIsRouteGenerated] = useState(false);

  const { getLLMPlaces } = useOpenAI();
  const { searchPlacesByName } = useGooglePlaces();
  const { trackRouteGeneration, trackBuyRouteClick, trackRoutePurchase, trackRouteRating, trackTextFeedback } = useAnalytics();
  const { generateSessionId, trackVisitorSession, trackLocationExit, saveRouteGeneration, saveBuyButtonClick, saveRoutePurchase, saveFeedback, testConnection } = useDatabase();

  // Use hardcoded Supabase client for testing
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Generate session ID and track visitor on component mount
  useEffect(() => {
    const initializeSession = async () => {
      if (!userSessionId) {
        const sessionId = generateSessionId(); // This will now get from localStorage or create new
        setUserSessionId(sessionId);
        console.log('=== SESSION INITIALIZED ===');
        console.log('Session ID:', sessionId);
        
        // Track visitor session (this will check if already tracked in this browser session)
        await trackVisitorSession(sessionId);
        
        // Test database connection on startup
        console.log('Testing database connection...');
        const connectionOk = await testConnection();
        console.log('Database connection test result:', connectionOk);
      }
    };
    
    initializeSession();
  }, [userSessionId, generateSessionId, trackVisitorSession, testConnection]);

  // Simplified payment success check - no longer needed but keeping for potential future use
  useEffect(() => {
    console.log("=== DEBUG: Payment success check (disabled) ===");
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success' || paymentStatus === 'cancel') {
      // Clean up URL parameters
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      // Clean up any stored data
      localStorage.removeItem('pendingRouteData');
      localStorage.removeItem('pendingRouteGenerationId');
      localStorage.removeItem('pendingUserSessionId');
    }
  }, []);

  // Function to convert coordinates to city name using reverse geocoding
  async function coordinatesToCityName(coords: string): Promise<string> {
    try {
      const [lat, lng] = coords.split(',').map(coord => parseFloat(coord.trim()));
      console.log('Reverse geocoding coordinates:', lat, lng);
      
      // Use OpenStreetMap Nominatim for reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      
      const data = await response.json();
      console.log('Reverse geocoding result:', data);
      
      // Extract city name from the response
      const cityName = data.address?.city || 
                     data.address?.town || 
                     data.address?.village || 
                     data.address?.municipality ||
                     data.display_name?.split(',')[0];
      
      return cityName || coords; // Fallback to coords if no city found
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return coords; // Fallback to original coordinates
    }
  }

  async function fetchPlacesWithGoals(goalsToUse: string[], isRegeneration = false) {
    console.log("=== DEBUG: fetchPlacesWithGoals called with OpenAI only ===");
    console.log("Goals parameter:", goalsToUse);
    console.log("Goals length:", goalsToUse?.length);
    console.log("Location:", location);
    console.log("Location type:", typeof location);
    console.log("Is location coordinates?", /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location));
    console.log("TimeWindow:", timeWindow);
    console.log("User Session ID:", userSessionId);
    console.log("Is regeneration:", isRegeneration);
    console.log("Current regeneration count:", regenerationCount);
    
    setError(null);
    setGenerating(true);
    setPlaces(null);
    
    let locationForSearch = location;
    
    // If location is coordinates, convert to city name
    if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location)) {
      console.log("Location is coordinates, converting to city name...");
      locationForSearch = await coordinatesToCityName(location);
      console.log("Converted location for search:", locationForSearch);
    }
    
    // Track route generation attempt
    trackRouteGeneration(locationForSearch, timeWindow?.toString() || "", goalsToUse);
    
    try {
      // Validation
      if (!locationForSearch || locationForSearch.trim() === "") {
        throw new Error("Location is required. Please go back and enter your location.");
      }
      
      if (!goalsToUse || !Array.isArray(goalsToUse) || goalsToUse.length === 0) {
        console.error("Goals validation failed:", { goals: goalsToUse, isArray: Array.isArray(goalsToUse), length: goalsToUse?.length });
        throw new Error("Please select at least one goal before generating places.");
      }

      // Create user prompt for AI
      const goalDescriptions = {
        restaurants: "find restaurants, bistros, eateries, dining establishments for meals and food",
        coffee: "find coffee shops, cafes, specialty roasters, tea houses for beverages and drinks", 
        work: "find cafes with wifi, coworking spaces, quiet work-friendly locations for working and productivity",
        museums: "visit museums, art galleries, cultural centers with exhibitions and displays",
        parks: "enjoy parks, gardens, green outdoor spaces for relaxation and nature",
        monuments: "explore architectural monuments, historical landmarks, heritage sites, castles, palaces, and significant buildings"
      };
      
      const selectedGoalTexts = goalsToUse.map(goal => goalDescriptions[goal as keyof typeof goalDescriptions]).filter(Boolean);
      const goalsText = selectedGoalTexts.join(" and ");
      
      let userPrompt = `I am currently at ${locationForSearch} and have ${timeWindow} minutes available. I want to ${goalsText}. Please suggest places that match my goals: ${goalsToUse.join(", ")}.`;
      
      if (isRegeneration) {
        userPrompt += ` This is a regeneration request - please provide different places than before.`;
      }
      
      console.log("=== DEBUG: Calling getLLMPlaces with OpenAI only ===");
      
      const currentRegenerationCount = isRegeneration ? regenerationCount : 0;
      
      const response: LLMPlace[] = await getLLMPlaces({
        location: locationForSearch,
        goals: goalsToUse,
        timeWindow: timeWindow || 60, // Pass as number (minutes), default to 1 hour
        userPrompt,
        regenerationAttempt: currentRegenerationCount,
        maxPlaces: 3,
      });
      
      console.log("=== DEBUG: Places Response ===");
      console.log("Places returned:", response);
      
      // Enrich places with real photos and coordinates using Google Places API
      console.log("=== DEBUG: Enriching places with Google Places data ===");
      const placesWithPhotos: LLMPlace[] = await Promise.all(
        response.map(async (place, index) => {
          console.log(`\n--- Processing place ${index + 1}: ${place.name} ---`);
          console.log("Original place data:", {
            name: place.name,
            address: place.address,
            hasPhotoUrl: !!place.photoUrl,
            photoUrl: place.photoUrl,
            type: place.type
          });
          
          try {
            // Use Google Places API to get real photos and coordinates
            const googlePlacesResponse = await searchPlacesByName({
              placeName: place.name,
              location: locationForSearch,
              placeType: place.type
            });
            
            console.log(`Google Places found ${googlePlacesResponse.length} results for ${place.name}`);
            
            if (googlePlacesResponse.length > 0) {
              const foundPlace = googlePlacesResponse[0];
              console.log("Google Places data:", {
                name: foundPlace.name,
                address: foundPlace.address,
                hasPhotoUrl: !!foundPlace.photoUrl,
                photoUrl: foundPlace.photoUrl,
                coordinates: foundPlace.coordinates,
                walkingTime: foundPlace.walkingTime
              });
              
              // Merge the data, prioritizing Google Places photos and coordinates
              const enrichedPlace: LLMPlace = {
                ...place,
                photoUrl: foundPlace.photoUrl || place.photoUrl,
                coordinates: foundPlace.coordinates || place.coordinates,
                lat: foundPlace.coordinates ? foundPlace.coordinates[1] : place.lat,
                lon: foundPlace.coordinates ? foundPlace.coordinates[0] : place.lon,
                walkingTime: foundPlace.walkingTime || place.walkingTime,
                // Ensure we always have a usable address - prioritize Google Places
                address: foundPlace.address || place.address || place.name
              };
              
              console.log("Final enriched place:", {
                name: enrichedPlace.name,
                hasPhotoUrl: !!enrichedPlace.photoUrl,
                photoUrl: enrichedPlace.photoUrl,
                coordinates: enrichedPlace.coordinates,
                lat: enrichedPlace.lat,
                lon: enrichedPlace.lon,
                address: enrichedPlace.address
              });
              
              return enrichedPlace;
            } else {
              console.log(`No Google Places match found for ${place.name}, using original data with fallbacks`);
              // Ensure we have usable data even without Google Places match
              const fallbackPlace: LLMPlace = {
                ...place,
                address: place.address || place.name,
                // If no coordinates available, we'll rely on address-based Google Maps links
              };
              
              console.log("Fallback place data:", {
                name: fallbackPlace.name,
                address: fallbackPlace.address,
                lat: fallbackPlace.lat,
                lon: fallbackPlace.lon,
                hasCoordinates: !!(fallbackPlace.lat && fallbackPlace.lon)
              });
              
              return fallbackPlace;
            }
          } catch (error) {
            console.error(`Error enriching place data for ${place.name}:`, error);
            return place;
          }
        })
      );
      
      console.log("=== DEBUG: Places with photos and coordinates ===");
      console.log("Places with photos:", placesWithPhotos);
      
      setPlaces(placesWithPhotos);
      
      // Update regeneration count if this was a regeneration
      if (isRegeneration) {
        setRegenerationCount(prev => prev + 1);
      } else {
        setRegenerationCount(0);
      }
      
      // Save route generation to database
      console.log("=== ATTEMPTING TO SAVE ROUTE GENERATION ===");
      console.log("Session ID for save:", userSessionId);
      const savedGeneration = await saveRouteGeneration(locationForSearch, timeWindow?.toString(), goalsToUse, response, userSessionId);
      if (savedGeneration) {
        console.log("Route generation saved with ID:", savedGeneration.id);
        setCurrentRouteGenerationId(savedGeneration.id);
      } else {
        console.error("Failed to save route generation to database");
      }
      
      setStep("detailed-map");
    } catch (e: any) {
      console.error("=== DEBUG: Error in fetchPlacesWithGoals ===", e);
      setError(e.message || "Could not generate route.");
      setStep("detailed-map");
    } finally {
      setGenerating(false);
    }
  }

  function regenerate() {
    console.log("=== DEBUG: Regenerate called ===");
    console.log("Current goals before regenerate:", goals);
    console.log("Current regeneration count:", regenerationCount);
    setStep("generating");
    fetchPlacesWithGoals(goals, true); // Pass true to indicate this is a regeneration
  }

  function reset() {
    console.log("=== DEBUG: Reset called ===");
    setLocation("");
    setCoordinates("");
    setTimeWindow(null);
    setGoals([]);
    setPlaces(null);
    setError(null);
    setPurchaseRoute(null);
    setRouteRating(null);
    setCurrentRouteGenerationId(null);
    setRegenerationCount(0); // Reset regeneration count
    // Don't regenerate session ID on reset, keep the same browser session
    localStorage.removeItem('pendingRouteData');
    localStorage.removeItem('pendingRouteGenerationId');
    localStorage.removeItem('pendingUserSessionId');
    setStep("chat");
    setChatVisible(true);
    setIsRouteGenerated(false);
  }

  function goBack() {
    console.log("=== DEBUG: goBack called from step:", step);
    switch (step) {
      case "generating":
        setStep("chat");
        setChatVisible(true);
        setIsRouteGenerated(false);
        break;
      case "detailed-map":
        setStep("generating");
        break;
      case "purchase":
        setStep("detailed-map");
        break;
      case "results":
        setStep("generating");
        break;
      default:
        setStep("chat");
        setChatVisible(true);
        setIsRouteGenerated(false);
    }
  }

  function handleBuyButtonClick(location: string, placesCount: number) {
    console.log("=== DEBUG: handleBuyButtonClick called ===");
    console.log("Location:", location);
    console.log("Places count:", placesCount);
    console.log("Current route generation ID:", currentRouteGenerationId);
    console.log("User session ID:", userSessionId);
    
    // Track the buy button click in analytics
    trackBuyRouteClick(location, placesCount);
    
    // Save buy button click to database
    console.log("Attempting to save buy button click to database...");
    saveBuyButtonClick(currentRouteGenerationId, location, placesCount, userSessionId);
  }

  function handleTextFeedback(feedback: string) {
    console.log("=== DEBUG: handleTextFeedback called ===");
    console.log("Feedback:", feedback);
    console.log("Places:", places);
    console.log("Location:", location);
    console.log("Current route generation ID:", currentRouteGenerationId);
    console.log("User session ID:", userSessionId);
    
    // Use current places and location if available, otherwise fall back to purchaseRoute
    const routeLocation = location || purchaseRoute?.origin;
    const routePlaces = places || purchaseRoute?.places;
    
    if (routeLocation && routePlaces) {
      trackTextFeedback(feedback, routeLocation, routePlaces.length);
      
      // Save feedback to database
      console.log("Attempting to save text feedback to database...");
      saveFeedback(
        currentRouteGenerationId,
        routeRating,
        feedback,
        routeLocation,
        routePlaces.length,
        userSessionId
      );
    } else {
      console.warn("No route data available for feedback", { location, places, purchaseRoute });
    }
  }

  function handleRouteRating(rating: number) {
    console.log("=== DEBUG: handleRouteRating called ===");
    console.log("Rating:", rating);
    console.log("Purchase route:", purchaseRoute);
    console.log("Current route generation ID:", currentRouteGenerationId);
    console.log("User session ID:", userSessionId);
    
    setRouteRating(rating);
    trackRouteRating(rating);
    
    // Save rating to database
    if (purchaseRoute) {
      console.log("Attempting to save rating to database...");
      saveFeedback(
        currentRouteGenerationId,
        rating,
        null,
        purchaseRoute.origin,
        purchaseRoute.places.length,
        userSessionId
      );
    } else {
      console.warn("No purchase route available for rating");
    }
  }

  // Modified to skip payment and go directly to purchase step
  function handleBuyRoute() {
    console.log("=== DEBUG: handleBuyRoute called (payment disabled) ===");
    console.log("Places:", places);
    console.log("Location:", location);
    console.log("Coordinates:", coordinates);
    console.log("Current route generation ID:", currentRouteGenerationId);
    console.log("User session ID:", userSessionId);
    
    if (!places || !location) {
      console.error("Missing places or location for route display");
      return;
    }
    
    // Use coordinates for the map route if available, otherwise use location
    const originForRoute = coordinates || location;
    const routeData = { origin: originForRoute, places };
    
    // Track route "purchase" (now just viewing)
    trackRoutePurchase(location, places.length);
    
    // Set purchase route and go directly to purchase step (now route display step)
    setPurchaseRoute(routeData);
    setStep("purchase");
    setIsRouteGenerated(true);
  }

  // Handler for location exit tracking
  function handleLocationChange(newLocation: string, exitAction: 'detect_location' | 'manual_input') {
    console.log("=== DEBUG: handleLocationChange called ===");
    console.log("New location:", newLocation);
    console.log("New location type:", typeof newLocation);
    console.log("Is new location coordinates?", /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(newLocation));
    console.log("Exit action:", exitAction);
    console.log("Current location:", location);
    console.log("User session ID:", userSessionId);
    
    // Track location exit every time the location button is clicked
    if (userSessionId) {
      console.log("Tracking location exit...");
      trackLocationExit(userSessionId, location || null, exitAction);
    } else {
      console.warn("No user session ID available for location exit tracking");
    }
    
    // Store coordinates separately if they are detected
    if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(newLocation)) {
      setCoordinates(newLocation);
      setLocation(newLocation); // We'll convert this to city name later
    } else {
      setLocation(newLocation);
      setCoordinates(""); // Clear coordinates if manual input
    }
    
    // Location is set, chat will continue with time question
  }

  function makeGoogleMapsRoute(origin: string, places: LLMPlace[] = []) {
    if (!places.length) return `https://maps.google.com`;

    const originEnc = encodeURIComponent(origin.trim());
    const waypointAddresses = places
      .slice(0, -1)
      .map(p => encodeURIComponent(p.address ? p.address : p.name));
    const destination =
      encodeURIComponent(
        (places[places.length - 1]?.address || places[places.length - 1]?.name || "")
      );

    let url = `https://www.google.com/maps/dir/?api=1&origin=${originEnc}&destination=${destination}&travelmode=walking`;
    if (waypointAddresses.length > 0) {
      url += `&waypoints=${waypointAddresses.join("|")}`;
    }
    return url;
  }

  function makeAppleMapsRoute(origin: string, places: LLMPlace[] = []) {
    if (!places.length) return `https://maps.apple.com`;

    const originStr = origin;
    const destinations = places.map(p => (p.address || p.name).replace(/\n/g, " ").trim());
    let url = `https://maps.apple.com/?saddr=${encodeURIComponent(originStr)}&daddr=${encodeURIComponent(destinations[0])}`;

    if (destinations.length > 1) {
      for (let i = 1; i < destinations.length; i++) {
        url += `%20to:${encodeURIComponent(destinations[i])}`;
      }
    }
    url += "&dirflg=w"; // walking
    return url;
  }

  const handleChatComplete = (data: { 
    scenario: "onsite" | "planning";
    location?: string; 
    timeMinutes?: number; 
    categories?: string[];
    destination?: string;
    destinationType?: "none" | "circle" | "specific";
    additionalSettings?: string[];
    city?: string;
    days?: number;
    accommodation?: string;
    hasAccommodation?: boolean;
  }) => {
    console.log("=== DEBUG: Chat completed ===");
    console.log("Data received:", data);
    
    // For now, handle onsite scenario like before
    if (data.scenario === "onsite" && data.location && data.timeMinutes && data.categories) {
      setLocation(data.location);
      setTimeWindow(data.timeMinutes);
      setGoals(data.categories);
      setChatVisible(false);
      setStep("generating");
      
      // Start generating places
      fetchPlacesWithGoals(data.categories);
    } else if (data.scenario === "planning") {
      // Handle planning scenario - for now just show a message
      console.log("Planning scenario not fully implemented yet");
      setChatVisible(false);
      // TODO: Implement trip planning logic
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F3FCF8] px-2 py-10">
      <ChatBot
        onComplete={handleChatComplete}
        isVisible={chatVisible}
        onToggleVisibility={() => setChatVisible(!chatVisible)}
        isRouteGenerated={isRouteGenerated}
      />
      
      {!chatVisible && (
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-md px-6 py-8 relative">
          {step === "generating" && (
            <>
              <div className="absolute top-4 left-4">
                <BackButton onClick={goBack} />
              </div>
              <GPTStep
                places={places || []}
                loading={generating}
                onDone={() => setStep("results")}
                error={error}
              />
            </>
          )}

          {step === "results" && (
            <>
              <div className="absolute top-4 left-4">
                <BackButton onClick={goBack} />
              </div>
              <RoutePreviewStep
                places={places || []}
                onRegenerate={regenerate}
                onBuy={handleBuyRoute}
                purchasing={paying}
                error={error}
                location={location}
                onTrackBuyClick={handleBuyButtonClick}
              />
            </>
          )}

          {step === "purchase" && (
            <>
              <div className="absolute top-4 left-4">
                <BackButton onClick={goBack} />
              </div>
              <PurchaseStep
                onFeedbackSubmit={handleTextFeedback}
                onStartNew={reset}
                purchaseRoute={purchaseRoute}
                makeGoogleMapsRoute={makeGoogleMapsRoute}
                makeAppleMapsRoute={makeAppleMapsRoute}
                routeRating={routeRating}
                onRatingSubmit={handleRouteRating}
                RouteRatingComponent={RouteRating}
                onViewDetailed={() => setStep("detailed-map")}
              />
            </>
          )}

          {step === "detailed-map" && places && (
            <>
              <div className="absolute top-4 left-4">
                <BackButton onClick={goBack} />
              </div>
              <DetailedMapStep
                places={places || []}
                origin={location}
                onBack={() => setStep("results")}
                onReset={reset}
                onFeedbackSubmit={handleTextFeedback}
              />
              {console.log("=== DEBUG: DetailedMapStep rendered ===")}
              {console.log("Enhanced Origin Data - Location String:", location)}
              {console.log("Enhanced Origin Data - Coordinates:", coordinates)}
              {console.log("Places with all data:", places?.map(p => ({ 
                name: p.name, 
                address: p.address, 
                lat: p.lat, 
                lon: p.lon, 
                hasCoordinates: !!(p.lat && p.lon),
                photoUrl: p.photoUrl ? 'present' : 'missing'
              })))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
