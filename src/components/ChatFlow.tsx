import React, { useState, useEffect } from "react";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDatabase } from "@/hooks/useDatabase";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "./BackButton";
import ChatBot from "./ChatBot";
import GPTStep from "./steps/GPTStep";
import RouteSummaryStep from "./steps/RouteSummaryStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import DetailedMapStep from "./steps/DetailedMapStep";
import RouteRating from "./RouteRating";
import FullscreenOverlay from "./FullscreenOverlay";
import BodyPortal from "./BodyPortal";

type Step =
  | "chat"
  | "generating"
  | "summary"
  | "purchase"
  | "detailed-map"
  | "route_preview";

export default function ChatFlow({ 
  onHeaderVisibilityChange,
  onStepChange 
}: { 
  onHeaderVisibilityChange?: (visible: boolean) => void;
  onStepChange?: (step: Step) => void;
}) {
  const [step, setStep] = useState<Step>("chat");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState(""); // Store coordinates separately for map
  const [timeWindow, setTimeWindow] = useState<number | null>(null);
  const [scenario, setScenario] = useState<"onsite" | "planning">("onsite");
  const [goals, setGoals] = useState<string[]>([]);
  const [travelType, setTravelType] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [days, setDays] = useState<number | undefined>(undefined);
  const [origin, setOrigin] = useState<string>("");
  const [originCoordinates, setOriginCoordinates] = useState<string>(""); // Store original coordinates
  const [destination, setDestination] = useState<string>("");
  const [destinationType, setDestinationType] = useState<"none" | "circle" | "specific">("none");
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [selectedDayPlaces, setSelectedDayPlaces] = useState<LLMPlace[] | null>(null);
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
  const [routeTimeData, setRouteTimeData] = useState<{
    requestedMinutes?: number;
    computedMinutes?: number;
    totalWalkingTime?: number;
    totalExploringTime?: number;
  } | null>(null);

  const { getLLMPlaces } = useOpenAI();
  const { searchPlacesByName } = useGooglePlaces();
  const { trackRouteGeneration, trackBuyRouteClick, trackRoutePurchase, trackRouteRating, trackTextFeedback } = useAnalytics();
  const { generateSessionId, trackVisitorSession, trackLocationExit, saveRouteGeneration, saveBuyButtonClick, saveRoutePurchase, saveFeedback, saveUserRoute, getSavedRoutes, testConnection } = useDatabase();
  const { trackButtonClick } = useButtonTracking();

  // REMOVED: Old saveStateNow function that used stale closure values

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

  // Restore state from localStorage on mount (runs first)
  const [isRestoringState, setIsRestoringState] = useState(true);
  
  useEffect(() => {
    console.log('🔄 Starting state restoration from localStorage...');
    
    // FIRST check chatBotState - it has priority if it exists with a summary step
    const chatBotState = localStorage.getItem('chatBotState');
    if (chatBotState) {
      try {
        const chatParsed = JSON.parse(chatBotState);
        console.log('🤖 Found chatBotState:', {
          step: chatParsed.currentStep,
          hasCollectedData: !!chatParsed.collectedData
        });
        
        // If ChatBot has summary step, it means route generation completed
        if (chatParsed.currentStep === 'summary' && chatParsed.collectedData) {
          console.log('✅ Restoring from ChatBot summary state');
          setStep('chat'); // We'll show chat, but ChatBot will display summary
          setChatVisible(true); // ChatBot handles the summary display
          setIsRestoringState(false);
          return;
        }
      } catch (error) {
        console.error('❌ Error parsing chatBotState:', error);
      }
    }
    
    // Otherwise, check savedRouteState for route generation state
    const savedState = localStorage.getItem('savedRouteState');
    console.log('📦 Raw savedState from localStorage:', savedState ? 'EXISTS' : 'NOT FOUND');
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        console.log('🔍 Parsed state:', {
          step: parsed.step,
          location: parsed.location,
          hasPlaces: !!parsed.places,
          placesCount: parsed.places?.length,
          timestamp: new Date(parsed.timestamp).toLocaleString()
        });
        
        setStep(parsed.step || 'chat');
        setLocation(parsed.location || '');
        setCoordinates(parsed.coordinates || '');
        setTimeWindow(parsed.timeWindow);
        setScenario(parsed.scenario || 'onsite');
        setGoals(parsed.goals || []);
        setOrigin(parsed.origin || '');
        setOriginCoordinates(parsed.originCoordinates || '');
        setDestination(parsed.destination || '');
        setDestinationType(parsed.destinationType || 'none');
        setPlaces(parsed.places || null);
        setTravelType(parsed.travelType || null);
        setPrefs(parsed.prefs || []);
        setDays(parsed.days);
        setCurrentRouteGenerationId(parsed.currentRouteGenerationId || null);
        setRegenerationCount(parsed.regenerationCount || 0);
        setIsRouteGenerated(parsed.isRouteGenerated || false);
        if (parsed.step !== 'chat') {
          setChatVisible(false); // Hide chat to show the route
        }
        console.log('✅ Route state restored successfully to step:', parsed.step);
      } catch (error) {
        console.error('❌ Error restoring state from localStorage:', error);
        localStorage.removeItem('savedRouteState');
      }
    } else {
      console.log('ℹ️ No saved state found, starting fresh');
    }
    setIsRestoringState(false);
    console.log('✓ State restoration completed');
  }, []);

  // Helper function to save state with explicit values (no closure issues)
  const saveState = (overrides: Partial<{
    step: Step;
    location: string;
    coordinates: string;
    timeWindow: number | null;
    scenario: "onsite" | "planning";
    goals: string[];
    origin: string;
    originCoordinates: string;
    destination: string;
    destinationType: "none" | "circle" | "specific";
    places: LLMPlace[] | null;
    travelType: string | null;
    prefs: string[];
    days: number | undefined;
    currentRouteGenerationId: string | null;
    regenerationCount: number;
    isRouteGenerated: boolean;
  }> = {}) => {
    if (isRestoringState) return;
    
    const stateToSave = {
      step: overrides.step ?? step,
      location: overrides.location ?? location,
      coordinates: overrides.coordinates ?? coordinates,
      timeWindow: overrides.timeWindow ?? timeWindow,
      scenario: overrides.scenario ?? scenario,
      goals: overrides.goals ?? goals,
      origin: overrides.origin ?? origin,
      originCoordinates: overrides.originCoordinates ?? originCoordinates,
      destination: overrides.destination ?? destination,
      destinationType: overrides.destinationType ?? destinationType,
      places: overrides.places ?? places,
      travelType: overrides.travelType ?? travelType,
      prefs: overrides.prefs ?? prefs,
      days: overrides.days ?? days,
      currentRouteGenerationId: overrides.currentRouteGenerationId ?? currentRouteGenerationId,
      regenerationCount: overrides.regenerationCount ?? regenerationCount,
      isRouteGenerated: overrides.isRouteGenerated ?? isRouteGenerated,
      timestamp: Date.now(),
    };
    
    try {
      localStorage.setItem('savedRouteState', JSON.stringify(stateToSave));
      console.log('💾 STATE SAVED:', {
        step: stateToSave.step,
        location: stateToSave.location?.substring(0, 30),
        hasPlaces: !!stateToSave.places,
        placesCount: stateToSave.places?.length,
        time: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('❌ Failed to save state:', error);
    }
  };

  // Auto-save state whenever important data changes  
  // But SKIP auto-save when step is being set to 'summary' - we save explicitly there
  useEffect(() => {
    // Don't save if restoring state
    if (isRestoringState) return;
    
    // Don't save empty places during active generation - wait for completion
    if (generating && !places) {
      console.log('⏸️ Skipping save: generation in progress with no places yet');
      return;
    }
    
    // Don't auto-save during summary step change - it's handled explicitly
    if (step === 'summary' && !places) {
      console.log('⏸️ Skipping save: summary step without places (will save explicitly)');
      return;
    }
    
    saveState();
  }, [isRestoringState, generating, step, location, coordinates, timeWindow, scenario, goals, travelType, prefs, days, origin, originCoordinates, destination, destinationType, places, currentRouteGenerationId, regenerationCount, isRouteGenerated]);

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
      
      // Use original coordinates if available, otherwise use locationForSearch
      const originToUse = originCoordinates || origin || locationForSearch;
      console.log("=== Route Generation Origin ===");
      console.log("Using origin:", originToUse);
      console.log("Original coordinates stored:", originCoordinates);
      console.log("City name for search:", locationForSearch);
      
      const llmResponse = await getLLMPlaces({
        location: locationForSearch,
        origin: originToUse, // Use coordinates if available
        destination: destination,
        destinationType: destinationType,
        goals: goalsToUse,
        timeWindow: timeWindow || 60, // Pass as number (minutes), default to 1 hour
        userPrompt,
        regenerationAttempt: currentRegenerationCount,
        maxPlaces: scenario === "planning" ? (timeWindow || 1) * 6 : 3, // 6 places per day for planning
        scenario: scenario || "onsite"
      });
      
      console.log("=== DEBUG: Places Response ===");
      console.log("Full LLM response:", llmResponse);
      
      const response = llmResponse.places;
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
                address: foundPlace.address || place.address || place.name,
                rating: (foundPlace as any).rating || (place as any).rating,
                openingHours: (foundPlace as any).openingHours || place.openingHours
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
      
      // Optimize route order using nearest-neighbor algorithm
      const { optimizeRouteOrder } = await import("@/lib/routeOptimization");
      const optimizedPlaces = optimizeRouteOrder(placesWithPhotos, originToUse);
      console.log("=== DEBUG: Route optimized for minimal travel ===");
      console.log("Optimized places:", optimizedPlaces.map(p => p.name));
      
      setPlaces(optimizedPlaces);
      
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
      
      console.log("=== SETTING STEP TO SUMMARY ===");
      console.log("Time window:", timeWindow);
      console.log("Goals:", goalsToUse);
      console.log("Places count:", optimizedPlaces?.length);
      
      // Update places FIRST, then step - this ensures saveState has correct data
      setPlaces(optimizedPlaces);
      setIsRouteGenerated(true);
      
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        setStep("summary");
        setChatVisible(false);
        
        // Save with explicit values after a short delay to ensure React state has updated
        setTimeout(() => {
          saveState({ 
            step: "summary",
            places: optimizedPlaces,
            isRouteGenerated: true
          });
          console.log("💾 Saved summary state with", optimizedPlaces?.length, "places");
        }, 50);
      }, 10);
    } catch (e: any) {
      console.error("=== DEBUG: Error in fetchPlacesWithGoals ===", e);
      setError(e.message || "Could not generate route.");
      
      saveState({ step: "summary" });
      setStep("summary");
    } finally {
      setGenerating(false);
    }
  }

  function regenerate() {
    console.log("=== DEBUG: Regenerate called ===");
    console.log("Current goals before regenerate:", goals);
    console.log("Current regeneration count:", regenerationCount);
    trackButtonClick('regenerate_route');
    
    saveState({ step: "generating" });
    setStep("generating");
    fetchPlacesWithGoals(goals, true);
  }

  function reset() {
    console.log("=== DEBUG: Reset called ===");
    trackButtonClick('reset_conversation');
    setLocation("");
    setCoordinates("");
    setOriginCoordinates(""); // Clear original coordinates
    setTimeWindow(null);
        setGoals([]);
        setPlaces(null);
        setError(null);
        setPurchaseRoute(null);
        setRouteRating(null);
        setCurrentRouteGenerationId(null);
        setRegenerationCount(0);
        setTravelType(null);
        setPrefs([]);
        setDays(undefined);
        // Don't regenerate session ID on reset, keep the same browser session
    localStorage.removeItem('pendingRouteData');
    localStorage.removeItem('pendingRouteGenerationId');
    localStorage.removeItem('pendingUserSessionId');
    localStorage.removeItem('savedRouteState'); // Clear saved route state
    setStep("chat");
    setChatVisible(true);
    setIsRouteGenerated(false);
  }

  function goBack() {
    console.log("=== DEBUG: goBack called from step:", step);
    let newStep: Step = step;
    let newChatVisible = chatVisible;
    let newIsRouteGenerated = isRouteGenerated;
    
    switch (step) {
      case "generating":
        newStep = "chat";
        newChatVisible = true;
        newIsRouteGenerated = false;
        break;
      case "summary":
        newStep = "generating";
        break;
      case "detailed-map":
        newStep = "summary";
        break;
      case "purchase":
        newStep = "detailed-map";
        break;
      default:
        newStep = "chat";
        newChatVisible = true;
        newIsRouteGenerated = false;
    }
    
    // Save with new values BEFORE state update
    saveState({ step: newStep, isRouteGenerated: newIsRouteGenerated });
    
    setStep(newStep);
    setChatVisible(newChatVisible);
    setIsRouteGenerated(newIsRouteGenerated);
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

  function handleBuyRoute() {
    console.log("=== DEBUG: handleBuyRoute called (payment disabled) ===");
    
    if (!places || !location) {
      console.error("Missing places or location for route display");
      return;
    }
    
    const originForRoute = coordinates || location;
    const routeData = { origin: originForRoute, places };
    
    trackRoutePurchase(location, places.length);
    
    saveState({ step: "purchase", isRouteGenerated: true });
    
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
    travelType?: string;
    city?: string;
    days?: number;
    accommodation?: string;
    hasAccommodation?: boolean;
    routeTimeData?: {
      requestedMinutes?: number;
      computedMinutes?: number;
      totalWalkingTime?: number;
      totalExploringTime?: number;
    };
  }) => {
    console.log("=== DEBUG: Chat completed ===");
    console.log("Data received:", data);
    
    // Handle onsite scenario
    if (data.scenario === "onsite" && data.location && data.timeMinutes && data.categories) {
      const isCoords = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(data.location);
      
      console.log("=== Starting route with ===");
      console.log("Origin:", data.location);
      console.log("Origin Coordinates:", isCoords ? data.location : "none");
      console.log("Destination:", data.destination);
      console.log("Destination Type:", data.destinationType);
      
      // Save BEFORE state updates
      saveState({
        scenario: data.scenario,
        location: data.location,
        origin: data.location,
        originCoordinates: isCoords ? data.location : "",
        destination: data.destination || "",
        destinationType: data.destinationType || "none",
        timeWindow: data.timeMinutes,
        goals: data.categories,
        travelType: data.travelType || null,
        prefs: data.additionalSettings || [],
        step: "generating"
      });
      
      // Update state
      setScenario(data.scenario);
      setLocation(data.location);
      setOrigin(data.location);
      if (isCoords) {
        setOriginCoordinates(data.location);
      }
      setDestination(data.destination || "");
      setDestinationType(data.destinationType || "none");
      setTimeWindow(data.timeMinutes);
      setGoals(data.categories);
      setTravelType(data.travelType || null);
      setPrefs(data.additionalSettings || []);
      setRouteTimeData(data.routeTimeData || null);
      setChatVisible(false);
      setStep("generating");
      
      // Start generating places
      fetchPlacesWithGoals(data.categories);
    } else if (data.scenario === "planning" && data.city && data.days && data.categories) {
      // Save BEFORE state updates
      saveState({
        scenario: data.scenario,
        location: data.city,
        origin: data.accommodation || data.city,
        timeWindow: data.days,
        days: data.days,
        goals: data.categories,
        travelType: data.travelType || null,
        prefs: data.additionalSettings || [],
        step: "generating"
      });
      
      // Handle planning scenario
      setScenario(data.scenario);
      setLocation(data.city);
      setOrigin(data.accommodation || data.city);
      setTimeWindow(data.days);
      setDays(data.days);
      setGoals(data.categories);
      setTravelType(data.travelType || null);
      setPrefs(data.additionalSettings || []);
      setRouteTimeData(data.routeTimeData || null);
      setChatVisible(false);
      setStep("generating");
      
      // Start generating places for trip planning
      fetchPlacesWithGoals(data.categories);
    } else {
      console.error("Missing required data for scenario:", data.scenario);
    }
  };

  const handleShowMap = () => {
    saveState({ step: "detailed-map" });
    setChatVisible(false);
    setStep("detailed-map");
  };

  const handleShowDayMap = (dayPlaces: LLMPlace[]) => {
    console.log("=== DEBUG: handleShowDayMap called ===");
    console.log("Day places:", dayPlaces);
    setSelectedDayPlaces(dayPlaces);
    handleShowMap();
  };

  // Notify parent about header visibility
  useEffect(() => {
    const shouldHideHeader = step === "summary" || (!chatVisible && (step === "route_preview" || step === "detailed-map"));
    onHeaderVisibilityChange?.(!shouldHideHeader);
  }, [chatVisible, step, onHeaderVisibilityChange]);

  // Reset scroll when entering summary
  useEffect(() => {
    if (step === "summary") {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [step]);

  // Block background scroll when summary is open
  useEffect(() => {
    if (step === "summary") {
      const { style: html } = document.documentElement;
      const { style: body } = document.body;
      const prevHtml = { overflow: html.overflow };
      const prevBody = { overflow: body.overflow, position: body.position, width: body.width };
      html.overflow = "hidden";
      body.overflow = "hidden";
      body.position = "relative";
      body.width = "100%";
      
      // Diagnostic: find scroll containers and transformed ancestors
      console.log("🔍 Summary scroll diagnostics:");
      let node: HTMLElement | null = document.querySelector("#root") || document.body;
      while (node) {
        const s = getComputedStyle(node);
        const scrollable =
          /(auto|scroll)/.test(s.overflow) ||
          /(auto|scroll)/.test(s.overflowY) ||
          /(auto|scroll)/.test(s.overflowX);
        const transformed = s.transform !== "none" || s.perspective !== "none" || s.filter !== "none";
        if (scrollable || transformed) {
          console.log(node.className || node.tagName, { 
            scrollable, 
            transformed, 
            overflow: s.overflow, 
            transform: s.transform, 
            filter: s.filter 
          });
        }
        node = node.parentElement;
      }
      
      return () => {
        html.overflow = prevHtml.overflow || "";
        body.overflow = prevBody.overflow || "";
        body.position = prevBody.position || "";
        body.width = prevBody.width || "";
      };
    }
  }, [step]);

  // Notify parent about step changes for key-based remounting
  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  // Early return for summary - completely separate fullscreen page with portal overlay
  if (step === "summary") {
    return (
      <BodyPortal>
        <FullscreenOverlay>
          <div className="relative">
            <div className="absolute top-4 left-4 z-10">
              <BackButton onClick={goBack} />
            </div>
            <RouteSummaryStep
              timeWindow={timeWindow}
              goals={goals}
              places={places || []}
              travelType={travelType}
              prefs={prefs}
              scenario={scenario}
              days={days}
              requestedMinutes={routeTimeData?.requestedMinutes}
              computedMinutes={routeTimeData?.computedMinutes}
              totalWalkingTime={routeTimeData?.totalWalkingTime}
              totalExploringTime={routeTimeData?.totalExploringTime}
              onContinue={() => {
                saveState({ step: "detailed-map" });
                setStep("detailed-map");
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                }
              }}
              onRegenerate={regenerate}
            />
          </div>
        </FullscreenOverlay>
      </BodyPortal>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {chatVisible && (
        <ChatBot
          onComplete={handleChatComplete}
          onShowMap={handleShowMap}
          isVisible={chatVisible}
          onToggleVisibility={() => setChatVisible(!chatVisible)}
          isRouteGenerated={isRouteGenerated}
        />
      )}
      
      {!chatVisible && (
        <div className={`w-full mx-auto bg-white shadow-md px-6 py-8 relative ${
          step === "route_preview" || step === "detailed-map"
            ? "absolute inset-0 overflow-y-auto rounded-none"
            : "max-w-md rounded-2xl"
        }`}>
          {step === "generating" && (
            <>
              <div className="absolute top-4 left-4">
                <BackButton onClick={goBack} />
              </div>
              <GPTStep
                places={places || []}
                loading={generating}
                onDone={() => {
                  console.log("=== GPTStep onDone called ===");
                  // Don't change step here, let fetchPlacesWithGoals handle it
                }}
                error={error}
                onStartNew={reset}
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
                onViewDetailed={() => {
                  saveState({ step: "detailed-map" });
                  setStep("detailed-map");
                }}
              />
            </>
          )}

          {step === "detailed-map" && (
            <>
              <div className="absolute top-4 left-4">
                <BackButton onClick={goBack} />
              </div>
              <DetailedMapStep
                places={selectedDayPlaces || places || []}
                origin={location}
                onBack={() => {
                  saveState({ step: "summary" });
                  setSelectedDayPlaces(null);
                  setStep("summary");
                }}
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
