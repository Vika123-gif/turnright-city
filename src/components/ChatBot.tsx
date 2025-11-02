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
  | "route_error"
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
  // State declarations
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [travelType, setTravelType] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [additionalSettings, setAdditionalSettings] = useState<string[]>([]);
  const [locationConsent, setLocationConsent] = useState<boolean>(false);
  const [destinationType, setDestinationType] = useState<"none" | "circle" | "specific">("none");
  const [selectedDays, setSelectedDays] = useState<string | null>(null);
  const [hasAccommodation, setHasAccommodation] = useState<boolean | null>(null);
  const [collectedData, setCollectedData] = useState<any>({});
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeTimeData, setRouteTimeData] = useState<any>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isRestoringState, setIsRestoringState] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { searchPlacesByName } = useGooglePlaces();
  const { trackButtonClick } = useButtonTracking();
  const { trackEvent } = useAnalytics();
  const { trackRouteGeneration } = useComprehensiveTracking();
  const { generateRoute } = useOpenAI();
  const { refreshGenerationLimit: refreshCredits } = useGenerationLimit();

  // Scroll to bottom on messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save chat state to localStorage
  useEffect(() => {
    if (isRestoringState) return;
    if (currentStep === "route_error") return;

    try {
      const chatState = {
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        currentStep,
        userInput,
        destinationInput,
        locationInput,
        selectedScenario,
        travelType,
        selectedTime,
        customMinutes,
        selectedCategories,
        additionalSettings,
        locationConsent,
        destinationType,
        selectedDays,
        hasAccommodation,
        collectedData,
        savedAt: Date.now(),
      };
      localStorage.setItem('chatBotState', JSON.stringify(chatState));
      console.log('💾 Chat state saved:', { 
        step: currentStep, 
        messagesCount: messages.length,
        hasCollectedData: !!collectedData.location || !!collectedData.city
      });
    } catch (error) {
      console.error('❌ Error saving chat state:', error);
    }
  }, [isRestoringState, messages, currentStep, userInput, destinationInput, locationInput, selectedScenario, travelType, selectedTime, customMinutes, selectedCategories, additionalSettings, locationConsent, destinationType, selectedDays, hasAccommodation, collectedData]);

  // Restore chat state from localStorage on mount
  useEffect(() => {
    console.log('🔄 Attempting to restore chat state from localStorage...');
    const savedState = localStorage.getItem('chatBotState');
    let hasRestoredState = false;

    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        console.log('📦 Found saved state:', {
          step: state.currentStep,
          messagesCount: state.messages?.length || 0,
          hasCollectedData: !!(state.collectedData?.location || state.collectedData?.city),
          savedAt: state.savedAt ? new Date(state.savedAt).toLocaleString() : 'unknown'
        });

        if (state.messages && Array.isArray(state.messages) && state.messages.length > 0) {
          const restoredMessages = state.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
          setMessages(restoredMessages);
          hasRestoredState = true;
        }

        if (state.currentStep) {
          if (state.currentStep === "route_preview" && (!state.places || state.places.length === 0)) {
            console.log('⚠️ Invalid state: route_preview without places, showing error screen');
            setCurrentStep("route_error");
            setError("Route generation failed. Please try again.");
          } else {
            setCurrentStep(state.currentStep);
          }
        }
        if (state.userInput !== undefined) setUserInput(state.userInput);
        if (state.destinationInput !== undefined) setDestinationInput(state.destinationInput);
        if (state.locationInput !== undefined) setLocationInput(state.locationInput);
        if (state.selectedScenario !== undefined) setSelectedScenario(state.selectedScenario);
        if (state.travelType !== undefined) setTravelType(state.travelType);
        if (state.selectedTime !== undefined) setSelectedTime(state.selectedTime);
        if (state.customMinutes !== undefined) setCustomMinutes(state.customMinutes);
        if (state.selectedCategories) setSelectedCategories(state.selectedCategories);
        if (state.additionalSettings) setAdditionalSettings(state.additionalSettings);
        if (state.locationConsent !== undefined) setLocationConsent(state.locationConsent);
        if (state.destinationType !== undefined) setDestinationType(state.destinationType);
        if (state.selectedDays !== undefined) setSelectedDays(state.selectedDays);
        if (state.hasAccommodation !== undefined) setHasAccommodation(state.hasAccommodation);
        if (state.collectedData) setCollectedData(state.collectedData);

        if (hasRestoredState) {
          console.log('✅ Chat state restored successfully');
        }
      } catch (error) {
        console.error('❌ Error restoring chat state:', error);
        localStorage.removeItem('chatBotState');
      }
    } else {
      console.log('ℹ️ No saved chat state found');
    }

    setIsRestoringState(false);

    if (!hasRestoredState) {
      addBotMessage("👋 Hi! I'm TurnRight, your personal city guide.");
      setTimeout(() => {
        addBotMessage("Choose your travel type.");
        setCurrentStep("travel_type");
      }, 1000);
    }
  }, []);

  // Add bot message helper
  const addBotMessage = (content: string) => {
    const message: Message = {
      id: `bot-${Date.now()}-${Math.random()}`,
      type: "bot",
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  // Add user message helper
  const addUserMessage = (content: string) => {
    const message: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      type: "user",
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  // Step navigation mapping
  const stepFlow = {
    onsite: ["travel_type", "scenario_fork", "location", "time", "destination", "destination_input", "interests", "additional_settings"],
    planning: ["travel_type", "scenario_fork", "city_dates", "accommodation", "accommodation_input", "trip_interests", "trip_settings"]
  };

  // Go back handler
  const handleGoBack = () => {
    const currentFlow = selectedScenario ? stepFlow[selectedScenario] : [];
    const currentIndex = currentFlow.indexOf(currentStep);

    if (currentIndex > 0) {
      const previousStep = currentFlow[currentIndex - 1];
      setCurrentStep(previousStep as ChatStep);
      setMessages(prev => prev.slice(0, -1));
    } else if (currentStep === "destination_input" && destinationType === "specific") {
      setCurrentStep("destination");
      setMessages(prev => prev.slice(0, -1));
    } else if (currentStep === "accommodation_input" && hasAccommodation) {
      setCurrentStep("accommodation");
      setMessages(prev => prev.slice(0, -1));
    } else if (currentStep === "travel_type") {
      setCurrentStep("welcome");
      setMessages(prev => prev.slice(0, -1));
    }
  };

  // Start new dialog
  const startNewDialog = () => {
    console.log("=== DEBUG: startNewDialog called ===");
    localStorage.removeItem('chatBotState');
    setMessages([]);
    setCurrentStep("travel_type");
    setSelectedScenario(null);
    setSelectedTime(null);
    setCustomMinutes(null);
    setSelectedCategories([]);
    setAdditionalSettings([]);
    setLocationConsent(false);
    setDestinationType("none");
    setSelectedDays(null);
    setHasAccommodation(null);
    setCollectedData({});
    setPlaces(null);
    setError(null);
    setUserInput("");
    setDestinationInput("");
    setLocationInput("");
    setIsRestoringState(false);
    refreshCredits();
    setTimeout(() => {
      addBotMessage("👋 Hi! I'm TurnRight, your personal city guide.");
      setTimeout(() => {
        addBotMessage("Choose your travel type.");
        setCurrentStep("travel_type");
      }, 1000);
    }, 100);
  };

  // Scenario select handler
  const handleScenarioSelect = (scenario: Scenario) => {
    trackButtonClick(`scenario_${scenario}`);
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

  // City submit handler
  const handleCitySubmit = () => {
    if (userInput.trim() && selectedDays) {
      trackButtonClick('city_submit');
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

  // Accommodation select handler
  const handleAccommodationSelect = (hasAccommodation: boolean) => {
    trackButtonClick(`accommodation_${hasAccommodation ? 'yes' : 'no'}`);
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

  // Proceed to trip interests
  const proceedToTripInterests = () => {
    setTimeout(() => {
      addBotMessage("What interests you for this trip? Select as many as you like:");
      setCurrentStep("trip_interests");
    }, 1000);
  };

  // Detect location handler
  const handleDetectLocation = () => {
    if (!locationConsent) {
      alert("Please consent to location access first.");
      return;
    }

    addUserMessage("📍 Using my current location");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const coords = lat.toFixed(5) + "," + lon.toFixed(5);
          handleLocationSubmit(coords);
        },
        () => {
          addBotMessage("❌ Couldn't get your location. Please enter it manually below.");
        }
      );
    } else {
      addBotMessage("❌ Location detection not supported. Please enter it manually below.");
    }
  };

  // Location submit handler
  const handleLocationSubmit = (location: string) => {
    trackButtonClick('location_submit');
    setCollectedData(prev => ({ ...prev, location }));
    addUserMessage(`📍 ${location}`);
    setTimeout(() => {
      addBotMessage("✅ Perfect! How much time do you have for exploring?");
      setCurrentStep("time");
    }, 1000);
  };

  // Time select handler
  const handleTimeSelect = (timeMinutes: number) => {
    trackButtonClick('time_selection');
    addUserMessage(`⏰ ${timeMinutes} minutes`);
    setCollectedData(prev => ({ ...prev, timeMinutes }));
    setTimeout(() => {
      addBotMessage("Do you need to end at a specific location?");
      setCurrentStep("destination");
    }, 1000);
  };

  // Destination select handler
  const handleDestinationSelect = (type: "none" | "circle" | "specific") => {
    trackButtonClick(`destination_${type}`);
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

  // Proceed to interests
  const proceedToInterests = () => {
    setTimeout(() => {
      addBotMessage("🎯 Great! What interests you? Select as many as you like:");
      setCurrentStep("interests");
    }, 1000);
  };

  // Interests submit handler
  const handleInterestsSubmit = (categories: string[]) => {
    trackButtonClick('interests_submit');
    addUserMessage(`🎯 ${categories.join(", ")}`);
    setCollectedData(prev => ({ ...prev, categories }));
    setTimeout(() => {
      addBotMessage("Any additional preferences?");
      setCurrentStep("additional_settings");
    }, 1000);
  };

  // Additional settings submit handler
  const handleAdditionalSettingsSubmit = (settings: string[]) => {
    setAdditionalSettings(settings);
    const finalData = { ...collectedData, additionalSettings: settings };
    setCollectedData(finalData);

    const { canGenerate, incrementGeneration } = useGenerationLimit();

    if (!canGenerate()) {
      setShowOptionsModal(true);
      incrementGeneration();
      return;
    }

    const canProceed = incrementGeneration();
    if (!canProceed) {
      return;
    }

    setTimeout(() => {
      addBotMessage(`🚀 Perfect! Let me create your personalized ${selectedScenario === "planning" ? "trip plan" : "route"}...`);
      setCurrentStep("generating");
      generateRoute(finalData);
    }, 1000);
  };

  // Generate route function
  const generateRoute = async (data: any) => {
    setError(null);
    setPlaces(null);

    try {
      const response = await generateRoute(data);
      if (!response || !response.places || response.places.length === 0) {
        throw new Error("No places found for your criteria. Try different settings.");
      }

      setPlaces(response.places);
      setCurrentStep("summary");
    } catch (e: any) {
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
      setCurrentStep("route_error");
    }
  };

  // Regenerate handler
  const handleRegenerate = () => {
    setPlaces([]);
    setCurrentStep("generating");
    generateRoute(collectedData);
  };

  // Buy route handler
  const handleBuyRoute = () => {
    setCurrentStep("complete");
    onComplete(collectedData);
  };

  // Accommodation submit handler
  const handleAccommodationSubmit = () => {
    if (userInput.trim()) {
      trackButtonClick('accommodation_submit');
      addUserMessage(`🏨 ${userInput}`);
      setCollectedData(prev => ({ ...prev, accommodation: userInput }));
      setUserInput("");
      proceedToTripInterests();
    }
  };

  // Destination submit handler
  const handleDestinationSubmit = () => {
    if (destinationInput.trim()) {
      trackButtonClick('destination_submit');
      addUserMessage(`📍 ${destinationInput}`);
      setCollectedData(prev => ({ ...prev, destination: destinationInput }));
      setDestinationInput("");
      proceedToInterests();
    }
  };

  // Manual location submit handler
  const handleManualLocation = () => {
    if (locationInput.trim()) {
      addUserMessage(`📍 ${locationInput}`);
      handleLocationSubmit(locationInput);
      setLocationInput("");
    }
  };

  // When minimized, show floating button
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

  // Check if current step is a fullscreen component (not a form step)
  const isFullscreenStep = currentStep === "route_preview" || currentStep === "detailed-map";

  return (
    <div className="relative min-h-[100dvh] bg-gradient-to-br from-gray-50 to-white">
      {/* Chat Messages - Scrollable middle section */}
      <div className="h-[calc(100dvh-var(--header-h)-var(--footer-h))] overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
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

      {/* Footer with action buttons - Fixed at bottom (only for regular form steps) */}
      {!isFullscreenStep && (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-[var(--footer-h)] bg-white border-t border-gray-100 overflow-y-auto">
          <div className="px-4 py-4">
            {/* Step components without extra wrappers */}
            {currentStep === "travel_type" && (
              <div>
                <div className="relative">
                  <div className="text-sm font-semibold text-gray-700 mb-3 text-center">Travel type</div>
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
              <div>
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
            )}

            {currentStep === "accommodation" && (
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
            )}

            {currentStep === "accommodation_input" && (
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
            )}

            {currentStep === "location" && (
              <LocationStep onNext={handleLocationSubmit} />
            )}

            {currentStep === "time" && (
              <OnSiteTimeStep onNext={handleTimeSelect} />
            )}

            {currentStep === "destination" && (
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
            )}

            {currentStep === "destination_input" && (
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
            )}

            {currentStep === "interests" && (
              <CategoriesStep onNext={handleInterestsSubmit} />
            )}

            {currentStep === "additional_settings" && (
              <AdditionalSettingsStep 
                onNext={handleAdditionalSettingsSubmit} 
                buttonText={selectedScenario === "planning" ? "Create Trip Plan" : "Generate Route"}
              />
            )}

            {currentStep === "trip_interests" && (
              <CategoriesStep onNext={(categories) => {
                addUserMessage(`🎯 ${categories.join(", ")}`);
                setCollectedData(prev => ({ ...prev, categories }));
                setTimeout(() => {
                  addBotMessage("Any additional preferences for your trip?");
                  setCurrentStep("trip_settings");
                }, 1000);
              }} />
            )}

            {currentStep === "trip_settings" && (
              <AdditionalSettingsStep 
                onNext={handleAdditionalSettingsSubmit} 
                buttonText="Create Trip Plan"
              />
            )}

            {currentStep === "route_results" && places && places.length > 0 && (
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
            )}

            {currentStep === "generating" && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-lg font-semibold text-gray-700">
                  🤖 Generating your perfect route...
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Finding the best places for you
                </div>
              </div>
            )}

            {currentStep === "summary" && (
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
            )}

            {(currentStep === "route_error" || (currentStep === "route_preview" && (!places || places.length === 0))) && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">❌</div>
                <div className="text-lg font-semibold text-gray-700 mb-2">
                  Couldn't generate route
                </div>
                <div className="text-sm text-gray-500 mb-6">
                  {error || "Please try again with different settings."}
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      const settingsStep = collectedData.scenario === "planning" ? "trip_settings" : "additional_settings";
                      setCurrentStep(settingsStep);
                      setError(null);
                      setPlaces(null);
                    }}
                    className="w-full py-3 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    ← Change Settings
                  </button>
                  <button
                    onClick={startNewDialog}
                    className="w-full py-3 px-6 bg-white border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-semibold rounded-2xl text-base transition-all duration-200 hover:bg-green-50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Start New Route
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen steps - outside footer */}
      {currentStep === "route_preview" && places && places.length > 0 && (
        <div className="absolute inset-0 overflow-y-auto">
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
            userSessionId="demo-session"
            goals={collectedData.categories || []}
            onStartNew={startNewDialog}
          />
        </div>
      )}

      {currentStep === "detailed-map" && (
        <div className="absolute inset-0">
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
              setCollectedData({});
              setCurrentStep("travel_type");
              setPlaces(null);
              setError(null);
              refreshCredits();
            }}
            onFeedbackSubmit={() => {}}
          />
        </div>
      )}

      {/* Modals */}
      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
        attemptsUsed={rateLimitInfo?.attemptsUsed || 3}
        resetAt={rateLimitInfo?.resetAt}
      />

      <GenerationOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        onPurchase={() => {
          console.log('=== DEBUG: User clicked purchase ===');
        }}
      />
    </div>
  );
};

export default ChatBot;
