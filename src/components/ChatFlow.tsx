import React, { useState, useEffect } from "react";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDatabase } from "@/hooks/useDatabase";
import { createClient } from "@supabase/supabase-js";
import WelcomeStep from "./steps/WelcomeStep";
import TimeStep from "./steps/TimeStep";
import GoalsStep from "./steps/GoalsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import RouteRating from "./RouteRating";

// HARDCODED SUPABASE CREDENTIALS FOR TESTING ONLY
const supabaseUrl = "https://gwwqfoplhhtyjkrhazbt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3d3Fmb3BsaGh0eWprcmhhemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDU5OTQsImV4cCI6MjA2NTU4MTk5NH0.fgFpmEdc3swzKw0xlGYt68a9vM9J2F3fKdT413UNoPk";

type Step =
  | "welcome"
  | "time"
  | "goals"
  | "generating"
  | "results"
  | "purchase";

export default function ChatFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [location, setLocation] = useState("");
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [routeRating, setRouteRating] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [purchaseRoute, setPurchaseRoute] = useState<{ origin: string; places: LLMPlace[] } | null>(null);
  const [userSessionId, setUserSessionId] = useState<string>("");
  const [currentRouteGenerationId, setCurrentRouteGenerationId] = useState<string | null>(null);

  const { getLLMPlaces } = useOpenAI();
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

  // Check for payment success on component mount
  useEffect(() => {
    console.log("=== DEBUG: Payment success check ===");
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    console.log("Payment status from URL:", paymentStatus);
    console.log("Session ID from URL:", sessionId);
    console.log("Current places:", places);
    console.log("Current location:", location);
    
    if (paymentStatus === 'success' && sessionId) {
      console.log("Payment success detected, setting up purchase route");
      
      // Store the session data in localStorage temporarily
      const storedRouteData = localStorage.getItem('pendingRouteData');
      if (storedRouteData) {
        try {
          const routeData = JSON.parse(storedRouteData);
          console.log("Restored route data from localStorage:", routeData);
          
          setPurchaseRoute(routeData);
          setPlaces(routeData.places);
          setLocation(routeData.origin);
          setStep("purchase");
          
          // Get the stored route generation ID
          const storedRouteGenerationId = localStorage.getItem('pendingRouteGenerationId');
          const storedUserSessionId = localStorage.getItem('pendingUserSessionId');
          
          // Save purchase to database with stored IDs
          console.log("Attempting to save purchase after payment success...");
          console.log("Using stored route generation ID:", storedRouteGenerationId);
          console.log("Using stored user session ID:", storedUserSessionId);
          
          if (storedRouteGenerationId && storedUserSessionId) {
            saveRoutePurchase(storedRouteGenerationId, routeData.origin, routeData.places.length, storedUserSessionId);
            // Update the current state with stored values
            setCurrentRouteGenerationId(storedRouteGenerationId);
            setUserSessionId(storedUserSessionId);
          } else {
            console.warn("Missing stored route generation ID or user session ID for purchase tracking");
          }
          
          // Clean up localStorage
          localStorage.removeItem('pendingRouteData');
          localStorage.removeItem('pendingRouteGenerationId');
          localStorage.removeItem('pendingUserSessionId');
        } catch (e) {
          console.error("Error parsing stored route data:", e);
        }
      } else if (places && location) {
        // Fallback to current state
        console.log("Using current state for purchase route");
        setPurchaseRoute({ origin: location, places });
        setStep("purchase");
        
        // Save purchase to database
        console.log("Attempting to save purchase with current state...");
        if (currentRouteGenerationId) {
          saveRoutePurchase(currentRouteGenerationId, location, places.length, userSessionId);
        } else {
          console.warn("No route generation ID available for purchase tracking");
        }
      }
      
      // Clean up URL parameters
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (paymentStatus === 'cancel') {
      console.log("Payment was cancelled");
      // Payment was cancelled, clean up URL
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      // Clean up any stored data
      localStorage.removeItem('pendingRouteData');
      localStorage.removeItem('pendingRouteGenerationId');
      localStorage.removeItem('pendingUserSessionId');
    }
  }, []); // Remove dependencies to avoid infinite loops

  async function fetchPlacesWithGoals(goalsToUse: string[]) {
    console.log("=== DEBUG: fetchPlacesWithGoals called ===");
    console.log("Goals parameter:", goalsToUse);
    console.log("Goals length:", goalsToUse?.length);
    console.log("Location:", location);
    console.log("TimeWindow:", timeWindow);
    console.log("User Session ID:", userSessionId);
    
    setError(null);
    setGenerating(true);
    setPlaces(null);
    
    // Track route generation attempt
    trackRouteGeneration(location, timeWindow || "", goalsToUse);
    
    try {
      // More detailed validation with better error messages
      if (!location || location.trim() === "") {
        throw new Error("Location is required. Please go back and enter your location.");
      }
      
      if (!goalsToUse || !Array.isArray(goalsToUse) || goalsToUse.length === 0) {
        console.error("Goals validation failed:", { goals: goalsToUse, isArray: Array.isArray(goalsToUse), length: goalsToUse?.length });
        throw new Error("Please select at least one goal before generating places.");
      }

      // Create a very explicit user prompt that clearly states the selected goals
      const goalDescriptions = {
        explore: "explore cultural attractions, museums, galleries, historical sites, or architectural landmarks",
        eat: "find restaurants, bistros, eateries, or dining establishments for meals",
        coffee: "find coffee shops, cafes, specialty roasters, or tea houses for beverages", 
        work: "find cafes with wifi, coworking spaces, or quiet work-friendly locations for working"
      };
      
      const selectedGoalTexts = goalsToUse.map(goal => goalDescriptions[goal as keyof typeof goalDescriptions]).filter(Boolean);
      
      console.log("=== DEBUG: Goal processing ===");
      console.log("Selected goal texts:", selectedGoalTexts);
      console.log("Goals being sent:", goalsToUse);
      
      if (selectedGoalTexts.length === 0) {
        throw new Error("No valid goals selected. Please select at least one goal.");
      }
      
      const goalsText = selectedGoalTexts.join(" and ");
      
      // Create very explicit user prompt
      let userPrompt = `I am currently at ${location} and have ${timeWindow} available. `;
      
      // Add very specific instructions based on selected goals
      if (goalsToUse.includes("eat")) {
        userPrompt += "I ONLY want to find restaurants, bistros, eateries, or places where I can have a meal. DO NOT suggest museums, galleries, or tourist attractions. ";
      }
      if (goalsToUse.includes("coffee")) {
        userPrompt += "I ONLY want to find coffee shops, cafes, or beverage establishments. DO NOT suggest museums, galleries, or tourist attractions. ";
      }
      if (goalsToUse.includes("explore")) {
        userPrompt += "I ONLY want to explore cultural attractions like museums, galleries, historical sites, or architectural landmarks. DO NOT suggest restaurants or cafes. ";
      }
      if (goalsToUse.includes("work")) {
        userPrompt += "I ONLY want to find work-friendly places like cafes with wifi or coworking spaces. ";
      }
      
      userPrompt += `Please suggest 1-2 places that match EXACTLY what I'm looking for. My selected goals are: ${goalsToUse.join(", ")}.`;
      
      console.log("=== DEBUG: Final prompt ===");
      console.log("User prompt:", userPrompt);
      console.log("Goals being passed to API:", goalsToUse);
      
      const response: LLMPlace[] = await getLLMPlaces({
        location,
        goals: goalsToUse,
        timeWindow: timeWindow || "",
        userPrompt,
      });
      
      console.log("=== DEBUG: API Response ===");
      console.log("Places returned:", response);
      
      setPlaces(response);
      
      // Save route generation to database
      console.log("=== ATTEMPTING TO SAVE ROUTE GENERATION ===");
      console.log("Session ID for save:", userSessionId);
      const savedGeneration = await saveRouteGeneration(location, timeWindow, goalsToUse, response, userSessionId);
      if (savedGeneration) {
        console.log("Route generation saved with ID:", savedGeneration.id);
        setCurrentRouteGenerationId(savedGeneration.id);
      } else {
        console.error("Failed to save route generation to database");
      }
      
      setStep("results");
    } catch (e: any) {
      console.error("=== DEBUG: Error in fetchPlacesWithGoals ===", e);
      setError(e.message || "Could not generate route.");
      setStep("results");
    } finally {
      setGenerating(false);
    }
  }

  function regenerate() {
    console.log("=== DEBUG: Regenerate called ===");
    console.log("Current goals before regenerate:", goals);
    setStep("generating");
    fetchPlacesWithGoals(goals);
  }

  function reset() {
    console.log("=== DEBUG: Reset called ===");
    setLocation("");
    setTimeWindow(null);
    setGoals([]);
    setPlaces(null);
    setError(null);
    setPurchaseRoute(null);
    setRouteRating(null);
    setCurrentRouteGenerationId(null);
    // Don't regenerate session ID on reset, keep the same browser session
    localStorage.removeItem('pendingRouteData');
    localStorage.removeItem('pendingRouteGenerationId');
    localStorage.removeItem('pendingUserSessionId');
    setStep("welcome");
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
    console.log("Purchase route:", purchaseRoute);
    console.log("Current route generation ID:", currentRouteGenerationId);
    console.log("User session ID:", userSessionId);
    
    if (purchaseRoute) {
      trackTextFeedback(feedback, purchaseRoute.origin, purchaseRoute.places.length);
      
      // Save feedback to database
      console.log("Attempting to save text feedback to database...");
      saveFeedback(
        currentRouteGenerationId,
        routeRating,
        feedback,
        purchaseRoute.origin,
        purchaseRoute.places.length,
        userSessionId
      );
    } else {
      console.warn("No purchase route available for feedback");
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
    console.log("=== DEBUG: handleBuyRoute called ===");
    console.log("Places:", places);
    console.log("Location:", location);
    console.log("Current route generation ID:", currentRouteGenerationId);
    console.log("User session ID:", userSessionId);
    
    if (!places || !location) {
      console.error("Missing places or location for purchase");
      return;
    }
    
    // Store route data AND IDs in localStorage before redirecting to payment
    const routeData = { origin: location, places };
    localStorage.setItem('pendingRouteData', JSON.stringify(routeData));
    localStorage.setItem('pendingRouteGenerationId', currentRouteGenerationId || '');
    localStorage.setItem('pendingUserSessionId', userSessionId);
    console.log("Stored route data and IDs in localStorage:", {
      routeData,
      routeGenerationId: currentRouteGenerationId,
      userSessionId
    });
    
    // Track route purchase
    trackRoutePurchase(location, places.length);
    
    setPurchaseRoute(routeData);
    setStep("purchase");
  }

  // Handler for location exit tracking
  function handleLocationChange(newLocation: string, exitAction: 'detect_location' | 'manual_input') {
    console.log("=== DEBUG: handleLocationChange called ===");
    console.log("New location:", newLocation);
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
    
    setLocation(newLocation);
    setStep("time");
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

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F3FCF8] px-2 py-10">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-md px-6 py-8 relative">
        {step === "welcome" && (
          <WelcomeStep
            onLocation={handleLocationChange}
            value={location}
          />
        )}

        {step === "time" && (
          <TimeStep
            onNext={(time) => {
              setTimeWindow(time);
              setStep("goals");
            }}
            value={timeWindow}
          />
        )}

        {step === "goals" && (
          <GoalsStep
            onNext={(selectedGoals) => {
              console.log("=== DEBUG: GoalsStep onNext called ===");
              console.log("Selected goals received:", selectedGoals, "Type:", typeof selectedGoals, "Array?", Array.isArray(selectedGoals));
              
              // Ensure we have a valid array
              if (!Array.isArray(selectedGoals)) {
                console.error("Goals is not an array:", selectedGoals);
                return;
              }
              
              setGoals(selectedGoals);
              console.log("Goals state set to:", selectedGoals);
              
              setStep("generating");
              
              // Call fetchPlacesWithGoals directly with the selectedGoals parameter
              // instead of relying on the state which may not be updated yet
              fetchPlacesWithGoals(selectedGoals);
            }}
            value={goals}
          />
        )}

        {step === "generating" && (
          <GPTStep
            places={places || []}
            loading={generating}
            onDone={() => setStep("results")}
            error={error}
          />
        )}

        {step === "results" && (
          <RoutePreviewStep
            places={places || []}
            onRegenerate={regenerate}
            onBuy={handleBuyRoute}
            purchasing={paying}
            error={error}
            location={location}
            onTrackBuyClick={handleBuyButtonClick}
          />
        )}

        {step === "purchase" && (
          <PurchaseStep
            onFeedbackSubmit={handleTextFeedback}
            onStartNew={reset}
            purchaseRoute={purchaseRoute}
            makeGoogleMapsRoute={makeGoogleMapsRoute}
            makeAppleMapsRoute={makeAppleMapsRoute}
            routeRating={routeRating}
            onRatingSubmit={handleRouteRating}
            RouteRatingComponent={RouteRating}
          />
        )}
      </div>
    </div>
  );
}
