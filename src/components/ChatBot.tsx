import React, { useState, useEffect, useRef } from "react";
import Button from "./Button";
import BackButton from "./BackButton";
import { MapPin, Clock, Shuffle, Send, ChevronUp, ChevronDown, Bot, User, ArrowLeft } from "lucide-react";
import CategoriesStep from "./steps/CategoriesStep";
import OnSiteTimeStep from "./steps/OnSiteTimeStep";
import PlanningTimeStep from "./steps/PlanningTimeStep";
import LocationStep from "./steps/LocationStep";
import AdditionalSettingsStep from "./steps/AdditionalSettingsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import DetailedMapStep from "./steps/DetailedMapStep";
import RouteSummaryStep from "./steps/RouteSummaryStep";
import { RateLimitModal } from "./RateLimitModal";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useComprehensiveTracking } from "@/hooks/useComprehensiveTracking";
import { useGenerationLimit } from "@/hooks/useGenerationLimit";
import GenerationOptionsModal from "./GenerationOptionsModal";

const CATEGORIES = [
  "Restaurants", "Cafés", "Bars", "Viewpoints", "Parks", "Museums",
  "Architectural landmarks", "Coworking", "Bakery", "Specialty coffee"
];

const TIMINGS = ["3h", "6h", "Half-day", "Day"];
const TIME_TO_MINUTES = { "3h": 180, "6h": 360, "Half-day": 240, "Day": 480 };

const DAYS_OPTIONS = ["1", "2", "3", "4", "5", "6", "7"];

const ADDITIONAL_SETTINGS = [
  "Mobility-friendly → Easy routes without stairs or steep paths.",
  "Avoid bad air → Avoid busy or polluted streets.",
  "Safety first →  Safer, well-lit, and comfortable zones."
];

type Scenario = "onsite" | "planning";
type ChatStep = 
  | "welcome" 
  | "scenario_fork"
  | "travel_type"
  // Scenario A (onsite) steps
  | "location" 
  | "time" 
  | "destination"
  | "destination_input"
  | "interests" 
  | "additional_settings"
  | "generating"
  | "summary"
  | "route_preview"
  | "route_results"
  | "detailed-map"
  // Scenario B (planning) steps  
  | "city_dates"
  | "accommodation"
  | "accommodation_input"
  | "trip_interests"
  | "trip_settings"
  | "trip_preview"
  | "complete";

type Message = {
  id: string;
  type: "bot" | "user";
  content: string;
  timestamp: Date;
};

type Props = {
  onComplete: (data: { 
    scenario: Scenario;
    location?: string; 
    timeMinutes?: number; 
    categories?: string[];
    destination?: string;
    destinationType?: "none" | "circle" | "specific";
    additionalSettings?: string[];
    // Planning scenario data
    city?: string;
    days?: number;
    accommodation?: string;
    hasAccommodation?: boolean;
  }) => void;
  onShowMap?: () => void; // New callback for showing map
  isVisible: boolean;
  onToggleVisibility: () => void;
  isRouteGenerated: boolean;
};

const ChatBot: React.FC<Props> = ({ onComplete, onShowMap, isVisible, onToggleVisibility, isRouteGenerated }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [travelType, setTravelType] = useState<string | null>(null);
  const { trackButtonClick: trackButtonClickDB } = useButtonTracking();
  const { trackButtonClick } = useAnalytics();
  const { trackRouteGeneration, trackFormSubmit, trackButtonClick: trackComprehensive } = useComprehensiveTracking();
  const { 
    canGenerate, 
    incrementGeneration, 
    showOptionsModal, 
    closeOptionsModal, 
    handlePurchase,
    generationCount,
    resetGenerationCount,
    getRemainingGenerations,
    getTotalGenerations,
    refreshCredits,
    FREE_GENERATIONS
  } = useGenerationLimit();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [additionalSettings, setAdditionalSettings] = useState<string[]>([]);
  const [locationConsent, setLocationConsent] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [destinationType, setDestinationType] = useState<"none" | "circle" | "specific" | null>(null);
  const [selectedDays, setSelectedDays] = useState<string | null>(null);
  const [hasAccommodation, setHasAccommodation] = useState<boolean | null>(null);
  const [collectedData, setCollectedData] = useState<{
    scenario: Scenario;
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
  }>({ scenario: "onsite" });
  
  // Route generation states
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeTimeData, setRouteTimeData] = useState<{
    requestedMinutes?: number;
    computedMinutes?: number;
    totalWalkingTime?: number;
    totalExploringTime?: number;
  } | null>(null);

  // Rate limiting states
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    attemptsUsed: number;
    resetAt?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getLLMPlaces } = useOpenAI();
  const { searchPlacesByName } = useGooglePlaces();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    addBotMessage("👋 Hi! I'm TurnRight, your personal city guide.");
    setTimeout(() => {
      addBotMessage("Choose your travel type.");
      setCurrentStep("travel_type");
    }, 1000);
  }, []);

  // Step navigation mapping
  const stepFlow = {
    onsite: ["travel_type", "scenario_fork", "location", "time", "destination", "destination_input", "interests", "additional_settings"],
    planning: ["travel_type", "scenario_fork", "city_dates", "accommodation", "accommodation_input", "trip_interests", "trip_settings"]
  };

  const handleGoBack = () => {
    const currentFlow = selectedScenario ? stepFlow[selectedScenario] : [];
    const currentIndex = currentFlow.indexOf(currentStep);
    
    if (currentIndex > 0) {
      const previousStep = currentFlow[currentIndex - 1];
      setCurrentStep(previousStep as ChatStep);
      
      // Remove the last message to undo the current step's message
      setMessages(prev => prev.slice(0, -1));
    } else if (currentStep === "destination_input" && destinationType === "specific") {
      // Special case: go back from destination_input to destination
      setCurrentStep("destination");
      setMessages(prev => prev.slice(0, -1));
    } else if (currentStep === "accommodation_input" && hasAccommodation) {
      // Special case: go back from accommodation_input to accommodation
      setCurrentStep("accommodation");
      setMessages(prev => prev.slice(0, -1));
    } else if (currentStep === "travel_type") {
      // Go back to welcome from the first step
      setCurrentStep("welcome");
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const startNewDialog = () => {
    console.log("=== DEBUG: startNewDialog called ===");
    // Reset all states
    setMessages([]);
    setCurrentStep("travel_type"); // Go to travel type selection instead of welcome
    setSelectedScenario(null);
    setSelectedTime(null);
    setCustomMinutes("");
    setSelectedCategories([]);
    setAdditionalSettings([]);
    setLocationConsent(false);
    setDetecting(false);
    setDestinationType(null);
    setSelectedDays(null);
    setHasAccommodation(null);
    setCollectedData({ scenario: "onsite" });
    setPlaces(null);
    setGenerating(false);
    setError(null);
    setUserInput("");
    setDestinationInput("");
    setLocationInput("");
    
    // Reload credits from database to show updated count
    refreshCredits();
    console.log("=== DEBUG: UI reset in startNewDialog, credits reloaded from database ===");
    
    // Restart with welcome message
    setTimeout(() => {
      addBotMessage("👋 Hi! I'm TurnRight, your personal city guide.");
      setTimeout(() => {
        addBotMessage("Choose your travel type.");
        setCurrentStep("travel_type");
      }, 1000);
    }, 100);
  };

  const addBotMessage = (content: string) => {
    const message: Message = {
      id: `bot-${Date.now()}-${Math.random()}`,
      type: "bot",
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      type: "user",
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    trackButtonClickDB(`scenario_${scenario}`);
    setSelectedScenario(scenario);
    setCollectedData(prev => ({ ...prev, scenario }));
    
    if (scenario === "onsite") {
      addUserMessage("🚶‍♂️ I'm already here");
      setTimeout(() => {
        addBotMessage("Perfect! I need to know your location. Would you like to share it automatically or enter it manually?");
        setCurrentStep("location");
      }, 1000);
    } else {
      addUserMessage("🗓️ Planning a trip");
      setTimeout(() => {
        addBotMessage("Great! Let's plan your trip. Which city would you like to visit and how many days will you stay?");
        setCurrentStep("city_dates");
      }, 1000);
    }
  };

  const handleCitySubmit = () => {
    if (userInput.trim() && selectedDays) {
      trackButtonClickDB('city_submit');
      // Normalize city: strip trailing "for N day(s)" or similar suffixes
      const cityOnly = userInput.replace(/\s+for\s+\d+\s+days?/i, '').trim();
      addUserMessage(`🏙️ ${cityOnly} for ${selectedDays} day${selectedDays !== "1" ? "s" : ""}`);
      setCollectedData(prev => ({
        ...prev,
        city: cityOnly,
        days: parseInt(selectedDays) 
      }));
      setUserInput("");
      
      setTimeout(() => {
        addBotMessage("Do you know the address of your hotel/apartment?");
        setCurrentStep("accommodation");
      }, 1000);
    }
  };

  const handleAccommodationSelect = (hasAccommodation: boolean) => {
    trackButtonClickDB(`accommodation_${hasAccommodation ? 'yes' : 'no'}`);
    setHasAccommodation(hasAccommodation);
    setCollectedData(prev => ({ ...prev, hasAccommodation }));
    
    if (hasAccommodation) {
      addUserMessage("🏨 Yes, I'll specify");
      setTimeout(() => {
        addBotMessage("Please enter your accommodation address:");
        setCurrentStep("accommodation_input");
      }, 1000);
    } else {
      addUserMessage("🏨 Not yet decided");
      setCollectedData(prev => ({ ...prev, accommodation: "City center (temporary)" }));
      proceedToTripInterests();
    }
  };

  const proceedToTripInterests = () => {
    setTimeout(() => {
      addBotMessage("What interests you for this trip? Select as many as you like:");
      setCurrentStep("trip_interests");
    }, 1000);
  };

  const handleDetectLocation = () => {
    if (!locationConsent) {
      alert("Please consent to location access first.");
      return;
    }

    setDetecting(true);
    addUserMessage("📍 Using my current location");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const coords = lat.toFixed(5) + "," + lon.toFixed(5);
          
          setDetecting(false);
          handleLocationSubmit(coords);
        },
        (err) => {
          setDetecting(false);
          addBotMessage("❌ Couldn't get your location. Please enter it manually below.");
        }
      );
    } else {
      setDetecting(false);
      addBotMessage("❌ Location detection not supported. Please enter it manually below.");
    }
  };

  const handleLocationSubmit = (location: string) => {
    trackButtonClickDB('location_submit');
    trackFormSubmit('location_input', { location }, 'ChatBot');
    
    const updatedData = { ...collectedData, location };
    setCollectedData(updatedData);
    console.log('Location set in collectedData:', updatedData);
    
    addUserMessage(`📍 ${location}`);
    setTimeout(() => {
      addBotMessage("✅ Perfect! How much time do you have for exploring?");
      setCurrentStep("time");
    }, 1000);
  };

  const handleTimeSelect = (timeMinutes: number) => {
    trackFormSubmit('time_selection', { timeMinutes }, 'ChatBot');
    
    addUserMessage(`⏰ ${timeMinutes} minutes`);
    setCollectedData(prev => ({ ...prev, timeMinutes }));
    setTimeout(() => {
      addBotMessage("Do you need to end at a specific location?");
      setCurrentStep("destination");
    }, 1000);
  };

  const handleDestinationSelect = (type: "none" | "circle" | "specific") => {
    trackButtonClickDB(`destination_${type}`);
    setDestinationType(type);
    setCollectedData(prev => ({ ...prev, destinationType: type }));
    
    let userMessage = "";
    switch (type) {
      case "none":
        userMessage = "🚶‍♂️ No specific end point";
        break;
      case "circle":
        userMessage = "🔄 Circle route back to start";
        break;
      case "specific":
        userMessage = "📍 I'll specify end point";
        break;
    }
    
    addUserMessage(userMessage);
    
    if (type === "specific") {
      setTimeout(() => {
        addBotMessage("Please enter your destination address:");
        setCurrentStep("destination_input");
      }, 1000);
    } else {
      proceedToInterests();
    }
  };

  const proceedToInterests = () => {
    setTimeout(() => {
      addBotMessage("🎯 Great! What interests you? Select as many as you like:");
      setCurrentStep("interests");
    }, 1000);
  };

  const handleInterestsSubmit = (categories: string[]) => {
    trackButtonClickDB('interests_submit');
    trackFormSubmit('interests_selection', { categories, categoriesCount: categories.length }, 'ChatBot');
    
    addUserMessage(`🎯 ${categories.join(", ")}`);
    const updatedData = { ...collectedData, categories };
    setCollectedData(updatedData);
    console.log('Categories set in collectedData:', updatedData);
    
    setTimeout(() => {
      addBotMessage("Any additional preferences?");
      setCurrentStep("additional_settings");
    }, 1000);
  };

  const handleAdditionalSettingsSubmit = async (settings: string[]) => {
    console.log("=== DEBUG: handleAdditionalSettingsSubmit called ===");
    console.log("Settings:", settings);
    console.log("Current generation count:", generationCount);
    console.log("Can generate:", canGenerate());
    
    const finalData = { ...collectedData, additionalSettings: settings };
    setCollectedData(finalData);
    console.log('Final data being sent:', finalData);
    
    // Check generation limit before starting
    if (!canGenerate()) {
      console.log("=== DEBUG: Generation limit reached, showing options modal ===");
      // This will show the options modal
      incrementGeneration();
      return;
    }
    
    console.log("=== DEBUG: Proceeding with route generation ===");
    
    // Increment generation count
    const canProceed = incrementGeneration();
    if (!canProceed) {
      console.log("=== DEBUG: incrementGeneration returned false ===");
      return; // Options modal will be shown
    }
    
    console.log("=== DEBUG: Starting route generation ===");
    
    // Start route generation
    setTimeout(() => {
      addBotMessage(`🚀 Perfect! Let me create your personalized ${selectedScenario === "planning" ? "trip plan" : "route"}...`);
      setCurrentStep("generating");
      generateRoute(finalData);
    }, 1000);
  };

  const generateRoute = async (data: any) => {
    console.log("=== DEBUG: generateRoute function called ===");
    setGenerating(true);
    setError(null);
    
    const generationStartTime = new Date();
    
    try {
      console.log("=== DEBUG: Starting route generation ===");
      console.log("Data:", data);
      console.log("Scenario:", data.scenario);

      // Track route generation start (with error handling)
      try {
        console.log("=== DEBUG: Calling trackRouteGeneration ===");
        const routeGenerationId = await trackRouteGeneration({
          scenario: data.scenario,
          location: data.location || data.city || "",
          timeWindow: data.timeMinutes || (data.days ? data.days * 480 : undefined),
          goals: data.categories || [],
          additionalSettings: data.additionalSettings || [],
          destinationType: data.destinationType,
          destination: data.destination,
          days: data.days,
          generationStartedAt: generationStartTime
        });
        console.log("=== DEBUG: trackRouteGeneration completed ===", routeGenerationId);
      } catch (trackError) {
        console.error("=== DEBUG: trackRouteGeneration failed ===", trackError);
        // Continue with route generation even if tracking fails
      }
      
      console.log("=== DEBUG: After tracking, continuing with route generation ===");
      
      let location: string;
      let timeWindow: number;
      let categories: string[] = [];
      let userPrompt: string;
      let originForApi: any = undefined;
      
      if (data.scenario === "planning") {
        // Planning scenario: use city and days; hook will convert days → minutes
        location = data.city || "";
        const days = data.days || 1;
        timeWindow = days; // keep as days; conversion happens in useOpenAI
        categories = data.categories || [];
        userPrompt = `Generate a ${days}-day trip plan for ${location} with interests: ${categories.join(", ")}`;
        
        console.log("Planning scenario - City:", location);
        console.log("Planning scenario - Days:", timeWindow);
        console.log("Planning scenario - Categories:", categories);
      } else {
        // Onsite scenario: use location and time in minutes
        location = data.location || "";
        timeWindow = data.timeMinutes || 180;
        categories = data.categories || [];
        userPrompt = `Generate a route for ${timeWindow} minutes in ${location} with interests: ${categories.join(", ")}`;
        // If user provided coords like "lat,lon", pass as origin object for backend
        const m = typeof location === 'string' ? location.trim().match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/) : null;
        if (m) {
          const olat = parseFloat(m[1]);
          const olon = parseFloat(m[2]);
          if (!Number.isNaN(olat) && !Number.isNaN(olon)) {
            originForApi = { lat: olat, lon: olon };
          }
        }
        
        console.log("Onsite scenario - Location:", location);
        console.log("Onsite scenario - Time minutes:", timeWindow);
        console.log("Onsite scenario - Categories:", categories);
      }
      
      // Get LLM places
      console.log("=== DEBUG: About to call getLLMPlaces ===");
      console.log("Parameters:", {
        location,
        goals: categories,
        timeWindow: timeWindow,
        userPrompt: userPrompt,
        scenario: data.scenario,
        origin: originForApi
      });
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Route generation timed out after 30 seconds")), 30000)
      );
      
      const response = await Promise.race([
        getLLMPlaces({
          location,
          goals: categories,
          timeWindow: timeWindow,
          userPrompt: userPrompt,
          scenario: data.scenario,
          origin: originForApi
        }),
        timeoutPromise
      ]) as any;
      
      console.log("=== DEBUG: LLM Response ===", response);
      
      if (!response || !response.places || response.places.length === 0) {
        throw new Error("No places found for your criteria. Try different settings.");
      }
      
      // Store time data from backend
      if (response.timeData) {
        setRouteTimeData(response.timeData);
      }
      
      // Enrich places with photos and coordinates
      const placesWithPhotos: LLMPlace[] = await Promise.all(
        response.places.map(async (place, index) => {
          try {
            // Get Google Places data
            const googlePlacesResponse = await searchPlacesByName({
              placeName: place.name,
              location: location,
              placeType: place.type
            });
            
            let enrichedPlace = place;
            if (googlePlacesResponse.length > 0) {
              const foundPlace = googlePlacesResponse[0];
              enrichedPlace = {
                ...place,
                photoUrl: foundPlace.photoUrl || place.photoUrl,
                coordinates: foundPlace.coordinates || place.coordinates,
                lat: foundPlace.coordinates ? foundPlace.coordinates[1] : place.lat,
                lon: foundPlace.coordinates ? foundPlace.coordinates[0] : place.lon,
                walkingTime: foundPlace.walkingTime || place.walkingTime,
                address: foundPlace.address || place.address || place.name
              };
            } else {
              enrichedPlace = {
                ...place,
                address: place.address || place.name,
              };
            }

            // Generate AI description
            try {
              const descResponse = await fetch('https://gwwqfoplhhtyjkrhazbt.supabase.co/functions/v1/generate-place-description', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3d3Fmb3BsaGh0eWprcmhhemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDU5OTQsImV4cCI6MjA2NTU4MTk5NH0.fgFpmEdc3swzKw0xlGYt68a9vM9J2F3fKdT413UNoPk'
                },
                body: JSON.stringify({
                  placeName: place.name,
                  placeType: place.type || 'attraction',
                  city: location
                })
              });

              if (descResponse.ok) {
                const descData = await descResponse.json();
                enrichedPlace.description = descData.description;
              }
            } catch (descError) {
              console.error(`Error generating description for ${place.name}:`, descError);
            }

            return enrichedPlace;
          } catch (error) {
            console.error(`Error enriching place data for ${place.name}:`, error);
            return place;
          }
        })
      );
      
      console.log("=== DEBUG: Places with photos and descriptions ===", placesWithPhotos);
      
      // Track route generation completion
      const generationEndTime = new Date();
      const generationDuration = generationEndTime.getTime() - generationStartTime.getTime();
      
      console.log("=== DEBUG: Route generation completed ===");
      console.log("Places:", placesWithPhotos);
      console.log("Generation duration:", generationDuration, "ms");
      
      setPlaces(placesWithPhotos);
      
      // Store places and transition to summary step first
      setPlaces(placesWithPhotos);
      setCurrentStep("summary");
      
    } catch (e: any) {
      console.error("=== DEBUG: Error in generateRoute ===", e);
      
      // Handle rate limiting error
      if (e.message === "RATE_LIMIT_EXCEEDED") {
        setRateLimitInfo({
          attemptsUsed: 3,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
        setShowRateLimitModal(true);
        setCurrentStep("route_preview");
        return;
      }
      
      setError(e.message || "Could not generate route.");
      addBotMessage("❌ Sorry, I couldn't generate a route. Please try again with different settings.");
      setCurrentStep("route_preview");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    console.log("=== DEBUG: Regenerate called ===");
    setPlaces([]);
    setCurrentStep("generating");
    generateRoute(collectedData);
  };

  const handleBuyRoute = () => {
    console.log("=== DEBUG: handleBuyRoute called ===");
    // Complete the flow - show the route
    setCurrentStep("complete");
    onComplete(collectedData);
  };

  const handleAccommodationSubmit = () => {
    if (userInput.trim()) {
      trackButtonClickDB('accommodation_submit');
      addUserMessage(`🏨 ${userInput}`);
      setCollectedData(prev => ({ ...prev, accommodation: userInput }));
      setUserInput("");
      proceedToTripInterests();
    }
  };

  const handleDestinationSubmit = () => {
    if (destinationInput.trim()) {
      trackButtonClickDB('destination_submit');
      addUserMessage(`📍 ${destinationInput}`);
      setCollectedData(prev => ({ ...prev, destination: destinationInput }));
      setDestinationInput("");
      proceedToInterests();
    }
  };

  const handleManualLocation = () => {
    if (locationInput.trim()) {
      addUserMessage(`📍 ${locationInput}`);
      handleLocationSubmit(locationInput);
      setLocationInput("");
    }
  };

  if (!isVisible && isRouteGenerated) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onToggleVisibility}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
          aria-label="Open chat"
        >
          <Bot className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white z-40 flex flex-col overflow-hidden">
      {/* Header */}
      {isRouteGenerated && (
        <div className="flex justify-between items-center p-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800">TurnRight</h3>
          </div>
          <button
            onClick={onToggleVisibility}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Minimize chat"
          >
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-fade-in ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {message.type === "bot" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[280px] sm:max-w-xs px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                message.type === "user"
                  ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white rounded-br-md"
                  : "bg-white border border-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {message.content && (
                <p className="text-sm leading-relaxed font-medium">
                  {message.content}
                </p>
              )}
            </div>
            
            {message.type === "user" && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Current Step Component */}
      {currentStep === "travel_type" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="relative py-4">
            <div className="text-sm font-semibold text-gray-700 mb-3 text-center">Travel type</div>
            {/* Checkbox-style list (single-select behavior) */}
            <div className="space-y-3">
              {['With family','Business','Couple / Romantic','Solo','With friends'].map((label) => {
                const active = travelType === label;
                return (
                  <label
                    key={label}
                    className={`flex items-center space-x-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 ${active ? 'border-[hsl(var(--primary))] bg-green-50' : 'border-gray-200 hover:border-[hsl(var(--primary))] hover:bg-green-50'}`}
                    onClick={() => setTravelType(label)}
                  >
                    <span className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]' : 'border-gray-300'}`} />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                );
              })}
            </div>
            {/* Next button: full width below the list */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setCollectedData(prev => ({ ...prev, travelType }));
                  setCurrentStep("scenario_fork");
                }}
                disabled={!travelType}
                className={`w-full py-3 rounded-2xl text-sm font-semibold ${
                  travelType ? 'bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >Next</button>
            </div>
          </div>
        </div>
      )}

      {currentStep === "scenario_fork" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2">
              <BackButton onClick={handleGoBack} />
            </div>
            <button
              onClick={() => {
                trackButtonClick("click_im_already_here", "I'm already here");
                handleScenarioSelect("onsite");
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <MapPin className="w-5 h-5" />
              I'm already here
            </button>
            <button
              onClick={() => {
                trackButtonClick("click_planning_a_trip", "Planning a trip");
                handleScenarioSelect("planning");
              }}
              className="w-full py-4 px-6 bg-white border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-semibold rounded-2xl text-base transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Clock className="w-5 h-5" />
              Planning a trip
            </button>
          </div>
        </div>
      )}

      {currentStep === "city_dates" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter city name..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCitySubmit()}
              className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-base font-medium"
            />
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OPTIONS.map((days) => (
                <button
                  key={days}
                  onClick={() => setSelectedDays(days)}
                  className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                    selectedDays === days
                      ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg"
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-[hsl(var(--primary))] hover:bg-green-50"
                  }`}
                >
                  {days} day{days !== "1" ? "s" : ""}
                </button>
              ))}
            </div>
            <button
              onClick={handleCitySubmit}
              disabled={!userInput.trim() || !selectedDays}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 ${
                !userInput.trim() || !selectedDays
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "accommodation" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleAccommodationSelect(true)}
              className="w-full py-4 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              Yes, I'll specify
            </button>
            <button
              onClick={() => handleAccommodationSelect(false)}
              className="w-full py-4 px-6 bg-white border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-semibold rounded-2xl text-base transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Not yet decided
            </button>
          </div>
        </div>
      )}

      {currentStep === "accommodation_input" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your accommodation address..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAccommodationSubmit()}
              className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-base font-medium"
            />
            <button
              onClick={handleAccommodationSubmit}
              disabled={!userInput.trim()}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 ${
                !userInput.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "location" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <LocationStep onNext={handleLocationSubmit} />
        </div>
      )}

      {currentStep === "time" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <OnSiteTimeStep onNext={(timeMinutes) => {
            addUserMessage(`⏰ ${timeMinutes} minutes`);
            setCollectedData(prev => ({ ...prev, timeMinutes }));
            setTimeout(() => {
              addBotMessage("Do you need to end at a specific location?");
              setCurrentStep("destination");
            }, 1000);
          }} />
        </div>
      )}

      {currentStep === "destination" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleDestinationSelect("none")}
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl text-base transition-all duration-200 hover:border-[hsl(var(--primary))] hover:bg-green-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              No specific end point
            </button>
            <button
              onClick={() => handleDestinationSelect("circle")}
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl text-base transition-all duration-200 hover:border-[hsl(var(--primary))] hover:bg-green-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Circle route back to start
            </button>
            <button
              onClick={() => handleDestinationSelect("specific")}
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl text-base transition-all duration-200 hover:border-[hsl(var(--primary))] hover:bg-green-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              I'll specify end point
            </button>
          </div>
        </div>
      )}

      {currentStep === "destination_input" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter destination address..."
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleDestinationSubmit()}
              className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-base font-medium"
            />
            <button
              onClick={handleDestinationSubmit}
              disabled={!destinationInput.trim()}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 ${
                !destinationInput.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "interests" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <CategoriesStep onNext={handleInterestsSubmit} />
        </div>
      )}

      {currentStep === "additional_settings" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <AdditionalSettingsStep 
            onNext={handleAdditionalSettingsSubmit} 
            buttonText={selectedScenario === "planning" ? "Create Trip Plan" : "Generate Route"}
          />
        </div>
      )}

      {currentStep === "trip_interests" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <CategoriesStep onNext={(categories) => {
            addUserMessage(`🎯 ${categories.join(", ")}`);
            const updatedData = { ...collectedData, categories };
            setCollectedData(updatedData);
            setTimeout(() => {
              addBotMessage("Any additional preferences for your trip?");
              setCurrentStep("trip_settings");
            }, 1000);
          }} />
        </div>
      )}

      {currentStep === "trip_settings" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleGoBack} />
          </div>
          <AdditionalSettingsStep 
            onNext={handleAdditionalSettingsSubmit} 
            buttonText="Create Trip Plan"
          />
        </div>
      )}

      {currentStep === "route_results" && places && places.length > 0 && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (onShowMap) {
                  onShowMap();
                } else {
                  setCurrentStep("complete");
                  onComplete(collectedData);
                }
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              🗺️ Show Interactive Map
            </button>
          </div>
        </div>
      )}

      {currentStep === "generating" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-700">
              🤖 Generating your perfect route...
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Finding the best places for you
            </div>
          </div>
        </div>
      )}

      {currentStep === "summary" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <RouteSummaryStep
            timeWindow={collectedData.scenario === "planning" ? (collectedData.days || null) : (collectedData.timeMinutes || null)}
            goals={collectedData.categories || []}
            places={places || []}
            travelType={travelType || (collectedData as any).travelType}
            prefs={(collectedData.additionalSettings || additionalSettings) as string[]}
            scenario={collectedData.scenario}
            days={collectedData.days}
            requestedMinutes={routeTimeData?.requestedMinutes}
            computedMinutes={routeTimeData?.computedMinutes}
            totalWalkingTime={routeTimeData?.totalWalkingTime}
            totalExploringTime={routeTimeData?.totalExploringTime}
            onContinue={() => setCurrentStep("detailed-map")}
          />
        </div>
      )}

      {currentStep === "route_preview" && places && places.length > 0 && (
        <div className="flex-1 flex flex-col">
          <RoutePreviewStep
            places={places}
            onRegenerate={handleRegenerate}
            onBuy={() => {
              if (onShowMap) {
                onShowMap();
              } else {
                setCurrentStep("complete");
                onComplete(collectedData);
              }
            }}
            purchasing={false}
            location={collectedData.location || collectedData.city || ''}
            days={collectedData.days || 1}
            scenario={collectedData.scenario}
            userSessionId="demo-session" // Временная сессия для демо
            goals={collectedData.categories || []}
            onStartNew={startNewDialog}
          />
        </div>
      )}

      {currentStep === "detailed-map" && (
        <div className="flex-1 flex flex-col">
          <DetailedMapStep
            places={places || []}
            origin={collectedData.location || collectedData.city || ''}
            destination={(collectedData.destinationType === 'circle')
              ? (collectedData.location || collectedData.city || '')
              : (collectedData.destinationType === 'specific' ? (collectedData.destination || '') : undefined)}
            destinationType={collectedData.destinationType || 'none'}
            scenario={collectedData.scenario}
            days={collectedData.days}
            onBack={() => setCurrentStep("summary")}
            onReset={() => {
              console.log("=== DEBUG: Start Again button clicked ===");
              // Reset all collected data and go back to chat
              setCollectedData({} as any);
              setCurrentStep("travel_type" as any); // Go back to travel type selection
              setPlaces(null);
              setError(null);
              // Reload credits from database to show updated count
              refreshCredits();
              console.log("=== DEBUG: UI reset, credits reloaded from database ===");
            }}
            onFeedbackSubmit={() => {}}
          />
        </div>
      )}

      {currentStep === "route_results" && places && places.length > 0 && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (onShowMap) {
                  onShowMap();
                } else {
                  setCurrentStep("complete");
                  onComplete(collectedData);
                }
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              🗺️ Show Interactive Map
            </button>
          </div>
        </div>
      )}

      {/* Rate Limit Modal */}
      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
        attemptsUsed={rateLimitInfo?.attemptsUsed || 3}
        resetAt={rateLimitInfo?.resetAt}
      />

      {/* Generation Options Modal */}
      <GenerationOptionsModal
        isOpen={showOptionsModal}
        onClose={closeOptionsModal}
        onPurchase={() => {
          console.log('=== DEBUG: User clicked purchase ===');
          handlePurchase();
        }}
      />
    </div>
  );
};

export default ChatBot;