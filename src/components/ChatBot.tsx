import React, { useState, useEffect, useRef } from "react";
import Button from "./Button";
import { MapPin, Clock, Shuffle, Send, ChevronUp, ChevronDown, Bot, User } from "lucide-react";
import CategoriesStep from "./steps/CategoriesStep";
import TimeStep from "./steps/TimeStep";
import LocationStep from "./steps/LocationStep";
import AdditionalSettingsStep from "./steps/AdditionalSettingsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";

const CATEGORIES = [
  "Restaurants", "Cafés", "Bars", "Viewpoints", "Parks", "Museums",
  "Architectural landmarks", "Coworking", "Bakery", "Specialty coffee"
];

const TIMINGS = ["3h", "6h", "Half-day", "Day"];
const TIME_TO_MINUTES = { "3h": 180, "6h": 360, "Half-day": 240, "Day": 480 };

const DAYS_OPTIONS = ["1", "2", "3", "4", "5", "6", "7"];

const ADDITIONAL_SETTINGS = [
  "Barrier-free",
  "More greenery", 
  "Avoid bad air",
  "Safety"
];

type Scenario = "onsite" | "planning";
type ChatStep = 
  | "welcome" 
  | "scenario_fork"
  // Scenario A (onsite) steps
  | "location" 
  | "time" 
  | "destination"
  | "destination_input"
  | "interests" 
  | "additional_settings"
  | "generating"
  | "route_preview"
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
  isVisible: boolean;
  onToggleVisibility: () => void;
  isRouteGenerated: boolean;
};

const ChatBot: React.FC<Props> = ({ onComplete, isVisible, onToggleVisibility, isRouteGenerated }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
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
      addBotMessage("Are you already in the city or planning a trip?");
      setCurrentStep("scenario_fork");
    }, 1000);
  }, []);

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
      addUserMessage(`🏙️ ${userInput} for ${selectedDays} day${selectedDays !== "1" ? "s" : ""}`);
      setCollectedData(prev => ({ 
        ...prev, 
        city: userInput, 
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
    addUserMessage(`⏰ ${timeMinutes} minutes`);
    setCollectedData(prev => ({ ...prev, timeMinutes }));
    setTimeout(() => {
      addBotMessage("Do you need to end at a specific location?");
      setCurrentStep("destination");
    }, 1000);
  };

  const handleDestinationSelect = (type: "none" | "circle" | "specific") => {
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
    const finalData = { ...collectedData, additionalSettings: settings };
    setCollectedData(finalData);
    console.log('Final data being sent:', finalData);
    
    // Start route generation
    setTimeout(() => {
      addBotMessage(`🚀 Perfect! Let me create your personalized ${selectedScenario === "planning" ? "trip plan" : "route"}...`);
      setCurrentStep("generating");
      generateRoute(finalData);
    }, 1000);
  };

  const generateRoute = async (data: any) => {
    setGenerating(true);
    setError(null);
    
    try {
      const { location, timeMinutes, categories = [] } = data;
      
      console.log("=== DEBUG: Starting route generation ===");
      console.log("Location:", location);
      console.log("Time minutes:", timeMinutes);
      console.log("Categories:", categories);
      
      // Get LLM places
      const response = await getLLMPlaces({
        location,
        goals: categories,
        timeWindow: timeMinutes,
        userPrompt: `Generate a route for ${timeMinutes} minutes in ${location} with interests: ${categories.join(", ")}`
      });
      console.log("=== DEBUG: LLM Response ===", response);
      
      if (!response || response.length === 0) {
        throw new Error("No places found for your criteria. Try different settings.");
      }
      
      // Enrich places with photos and coordinates
      const placesWithPhotos: LLMPlace[] = await Promise.all(
        response.map(async (place, index) => {
          try {
            const googlePlacesResponse = await searchPlacesByName({
              placeName: place.name,
              location: location,
              placeType: place.type
            });
            
            if (googlePlacesResponse.length > 0) {
              const foundPlace = googlePlacesResponse[0];
              return {
                ...place,
                photoUrl: foundPlace.photoUrl || place.photoUrl,
                coordinates: foundPlace.coordinates || place.coordinates,
                lat: foundPlace.coordinates ? foundPlace.coordinates[1] : place.lat,
                lon: foundPlace.coordinates ? foundPlace.coordinates[0] : place.lon,
                walkingTime: foundPlace.walkingTime || place.walkingTime,
                address: foundPlace.address || place.address || place.name
              };
            } else {
              return {
                ...place,
                address: place.address || place.name,
              };
            }
          } catch (error) {
            console.error(`Error enriching place data for ${place.name}:`, error);
            return place;
          }
        })
      );
      
      console.log("=== DEBUG: Places with photos ===", placesWithPhotos);
      
      setPlaces(placesWithPhotos);
      setCurrentStep("route_preview");
      
    } catch (e: any) {
      console.error("=== DEBUG: Error in generateRoute ===", e);
      setError(e.message || "Could not generate route.");
      setCurrentStep("route_preview");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    console.log("=== DEBUG: Regenerate called ===");
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
      addUserMessage(`🏨 ${userInput}`);
      setCollectedData(prev => ({ ...prev, accommodation: userInput }));
      setUserInput("");
      proceedToTripInterests();
    }
  };

  const handleDestinationSubmit = () => {
    if (destinationInput.trim()) {
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-white z-40 flex flex-col">
      {/* Header */}
      {isRouteGenerated && (
        <div className="flex justify-between items-center p-4 bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm">
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
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
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
      {currentStep === "scenario_fork" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleScenarioSelect("onsite")}
              className="w-full py-4 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <MapPin className="w-5 h-5" />
              I'm already here
            </button>
            <button
              onClick={() => handleScenarioSelect("planning")}
              className="w-full py-4 px-6 bg-white border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] font-semibold rounded-2xl text-base transition-all duration-200 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Clock className="w-5 h-5" />
              Planning a trip
            </button>
          </div>
        </div>
      )}

      {currentStep === "city_dates" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
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
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
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
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
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
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <LocationStep onNext={handleLocationSubmit} />
        </div>
      )}

      {currentStep === "time" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <TimeStep onNext={(timeMinutes) => {
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
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
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
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
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
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <CategoriesStep onNext={handleInterestsSubmit} />
        </div>
      )}

      {currentStep === "additional_settings" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <AdditionalSettingsStep 
            onNext={handleAdditionalSettingsSubmit} 
            buttonText={selectedScenario === "planning" ? "Create Trip Plan" : "Generate Route"}
          />
        </div>
      )}

      {currentStep === "trip_interests" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
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
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <AdditionalSettingsStep 
            onNext={handleAdditionalSettingsSubmit} 
            buttonText="Create Trip Plan"
          />
        </div>
      )}

      {currentStep === "generating" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <GPTStep
            places={places || []}
            loading={generating}
            onDone={() => setCurrentStep("route_preview")}
            error={error}
          />
        </div>
      )}

      {currentStep === "route_preview" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <RoutePreviewStep
            places={places || []}
            onRegenerate={handleRegenerate}
            onBuy={handleBuyRoute}
            purchasing={false}
            error={error}
            location={collectedData.location || ""}
          />
        </div>
      )}

      {/* Removed legacy time input */}
    </div>
  );
};

export default ChatBot;