import React, { useState, useEffect, useRef } from "react";
import Button from "./Button";
import { MapPin, Clock, Shuffle, Send, ChevronUp, ChevronDown, Bot, User } from "lucide-react";
// Removed UI component imports for testing

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
  | "interests" 
  | "additional_settings"
  | "route_preview"
  // Scenario B (planning) steps  
  | "city_dates"
  | "accommodation"
  | "trip_interests"
  | "trip_settings"
  | "trip_preview"
  | "complete";

type Message = {
  id: string;
  type: "bot" | "user";
  content: string;
  timestamp: Date;
  component?: () => React.ReactNode;
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      
      addBotMessage("", () => (
        <div className="flex flex-col gap-3 mt-4">
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
      ));
      setCurrentStep("scenario_fork");
    }, 1000);
  }, []);

  const addBotMessage = (content: string, component?: () => React.ReactNode) => {
    const message: Message = {
      id: `bot-${Date.now()}-${Math.random()}`,
      type: "bot",
      content,
      timestamp: new Date(),
      component
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
        
        addBotMessage("", () => (
          <div className="space-y-4 mt-4">
            <input
              type="text"
              placeholder="Enter city name..."
              value={userInput}
              onChange={(e) => {
                console.log('City input changed:', e.target.value);
                setUserInput(e.target.value);
              }}
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
        ));
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
        
        addBotMessage("", () => (
          <div className="flex flex-col gap-3 mt-4">
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
        ));
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
        // Show input for accommodation address
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
      showInterestsComponent("trip_interests");
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
    
    setTimeout(() => {
      addBotMessage("✅ Perfect! How much time do you have for exploring?");
      showTimeComponent();
    }, 1000);
  };

  const showTimeComponent = () => {
    addBotMessage("⏰", () => (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          {TIMINGS.map((time) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                selectedTime === time
                  ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg"
                  : "bg-white border-2 border-gray-200 text-gray-700 hover:border-[hsl(var(--primary))] hover:bg-green-50"
              }`}
            >
              {time}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleTimeSelect("Custom")}
            className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
              selectedTime === "Custom"
                ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg"
                : "bg-white border-2 border-gray-200 text-gray-700 hover:border-[hsl(var(--primary))] hover:bg-green-50"
            }`}
          >
            Custom
          </button>
          {selectedTime === "Custom" && (
            <input
              type="number"
              placeholder="Minutes"
              value={customMinutes}
              onChange={(e) => {
                console.log('Custom minutes changed:', e.target.value);
                setCustomMinutes(e.target.value);
              }}
              className="flex-1 h-10 px-3 rounded-xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-sm font-medium"
              min="1"
            />
          )}
        </div>
      </div>
    ));
    setCurrentStep("time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    
    if (time !== "Custom") {
      const timeMinutes = TIME_TO_MINUTES[time as keyof typeof TIME_TO_MINUTES];
      addUserMessage(`⏰ ${time}`);
      setCollectedData(prev => ({ ...prev, timeMinutes }));
      proceedToDestination();
    }
  };

  const handleCustomTimeSubmit = () => {
    if (customMinutes) {
      const timeMinutes = parseInt(customMinutes);
      addUserMessage(`⏰ ${customMinutes} minutes`);
      setCollectedData(prev => ({ ...prev, timeMinutes }));
      proceedToDestination();
    }
  };

  const proceedToDestination = () => {
    setTimeout(() => {
      addBotMessage("Do you need to end at a specific location?");
      
      addBotMessage("", () => (
        <div className="flex flex-col gap-3 mt-4">
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
      ));
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
        
        addBotMessage("", () => (
          <div className="space-y-4 mt-4">
            <input
              type="text"
              placeholder="Enter destination address..."
              value={destinationInput}
              onChange={(e) => {
                console.log('Destination input changed:', e.target.value);
                setDestinationInput(e.target.value);
              }}
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
        ));
      }, 1000);
    } else {
      proceedToInterests();
    }
  };

  const proceedToInterests = () => {
    setTimeout(() => {
      addBotMessage("🎯 Great! What interests you? Select as many as you like:");
      showInterestsComponent("interests");
    }, 1000);
  };

  const renderCategories = (step: "interests" | "trip_interests") => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
         {CATEGORIES.map((category) => {
           const isChecked = selectedCategories.includes(category);
           return (
             <label 
               key={category} 
               className={`flex items-center space-x-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                 isChecked 
                   ? "border-[hsl(var(--primary))] bg-green-50" 
                   : "border-gray-200 hover:border-[hsl(var(--primary))] hover:bg-green-50"
               }`}
             >
               <input
                 type="checkbox"
                 checked={isChecked}
                 onChange={() => {
                   console.log('Toggling category:', category, 'Current state:', isChecked);
                   setSelectedCategories(prev => {
                     const newState = isChecked 
                       ? prev.filter(c => c !== category)
                       : [...prev, category];
                     console.log('New selectedCategories:', newState);
                     return newState;
                   });
                 }}
                 className="w-4 h-4 rounded border-gray-300 accent-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
               />
               <span className="text-sm font-medium text-gray-700">{category}</span>
             </label>
           );
         })}
      </div>
      <div className="flex flex-col gap-3">
         <button
           onClick={handleSurpriseMe}
           className="w-full py-3 px-6 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl text-base transition-all duration-200 hover:border-[hsl(var(--primary))] hover:bg-green-50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
         >
           <Shuffle className="w-5 h-5" />
           Surprise me
         </button>
         <button
           onClick={() => {
             console.log('Reset button clicked - clearing all categories');
             setSelectedCategories([]);
           }}
           className="w-full py-2 px-4 bg-red-50 border-2 border-red-200 text-red-600 font-semibold rounded-xl text-sm transition-all duration-200 hover:border-red-300 hover:bg-red-100 hover:scale-[1.02] active:scale-[0.98]"
         >
           Reset All
         </button>
         <button
           onClick={() => {
             console.log('Continue button clicked, selectedCategories:', selectedCategories);
             handleInterestsSubmit(step);
           }}
           disabled={selectedCategories.length === 0}
           className={`w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 ${
             selectedCategories.length === 0
               ? "bg-gray-100 text-gray-400 cursor-not-allowed"
               : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
           }`}
         >
           Continue ({selectedCategories.length})
         </button>
      </div>
    </div>
  );

  const showInterestsComponent = (step: "interests" | "trip_interests") => {
    addBotMessage("", () => renderCategories(step));
    setCurrentStep(step);
  };

  const handleSurpriseMe = () => {
    const numCategories = Math.floor(Math.random() * 3) + 2;
    const availableCategories = [...CATEGORIES];
    const selected = [];
    
    if (Math.random() < 0.5) {
      selected.push("Viewpoints");
      availableCategories.splice(availableCategories.indexOf("Viewpoints"), 1);
    }
    
    while (selected.length < numCategories && availableCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategories.length);
      selected.push(availableCategories.splice(randomIndex, 1)[0]);
    }
    
    setSelectedCategories(selected);
  };

  const handleInterestsSubmit = (step: "interests" | "trip_interests") => {
    if (selectedCategories.length > 0) {
      addUserMessage(`🎯 ${selectedCategories.join(", ")}`);
      const updatedData = { ...collectedData, categories: selectedCategories };
      setCollectedData(updatedData);
      console.log('Categories set in collectedData:', updatedData);
      
      setTimeout(() => {
        addBotMessage("Any additional preferences?");
        showAdditionalSettings(step === "interests" ? "additional_settings" : "trip_settings");
      }, 1000);
    }
  };

  const renderAdditionalSettings = (step: "additional_settings" | "trip_settings") => (
    <div className="space-y-4 mt-4">
      <div className="space-y-3">
        {ADDITIONAL_SETTINGS.map((setting) => (
          <label key={setting} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border-2 border-gray-200 hover:border-[hsl(var(--primary))] hover:bg-green-50 transition-all duration-200 hover:scale-[1.02]">
            <input
              type="checkbox"
              checked={additionalSettings.includes(setting)}
              onChange={(e) => {
                const checked = e.target.checked;
                console.log('Additional setting checkbox changed:', setting, checked);
                if (checked) {
                  setAdditionalSettings(prev => [...prev, setting]);
                } else {
                  setAdditionalSettings(prev => prev.filter(s => s !== setting));
                }
              }}
              className="w-4 h-4 rounded border-gray-300 accent-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
            />
            <span className="text-sm font-medium text-gray-700">{setting}</span>
          </label>
        ))}
      </div>
      <button
        onClick={() => handleSettingsSubmit(step)}
        className="w-full py-4 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      >
        {selectedScenario === "planning" ? "Create Trip Plan" : "Generate Route"}
      </button>
    </div>
  );

  const showAdditionalSettings = (step: "additional_settings" | "trip_settings") => {
    addBotMessage("", () => renderAdditionalSettings(step));
    setCurrentStep(step);
  };

  const handleSettingsSubmit = (step: "additional_settings" | "trip_settings") => {
    const finalData = { ...collectedData, additionalSettings };
    setCollectedData(finalData);
    console.log('Final data being sent:', finalData);
    setCurrentStep("complete");
    
    setTimeout(() => {
      addBotMessage(`🚀 Perfect! Let me create your personalized ${selectedScenario === "planning" ? "trip plan" : "route"}...`);
      onComplete(finalData);
    }, 1000);
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

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-gray-50 to-white z-40 flex flex-col ${!isVisible && isRouteGenerated ? 'hidden' : ''}`}>
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
              {message.component && (
                <div className="mt-3">
                  {message.component()}
                </div>
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

      {/* Input Areas */}
      {currentStep === "location" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
            <input
              type="checkbox"
              id="locationConsent"
              checked={locationConsent}
              onChange={(e) => setLocationConsent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-2 border-gray-300 text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
            />
            <label htmlFor="locationConsent" className="text-sm text-gray-700 leading-relaxed font-medium">
              I consent to sharing my location for personalized recommendations
            </label>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleDetectLocation}
              disabled={detecting || !locationConsent}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 ${
                detecting || !locationConsent
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <MapPin className="w-5 h-5" />
              {detecting ? "Detecting..." : "Share My Location"}
            </button>
            
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Or enter location manually..."
                value={locationInput}
                onChange={(e) => {
                  console.log('Location input changed:', e.target.value);
                  setLocationInput(e.target.value);
                }}
                onKeyPress={(e) => e.key === "Enter" && handleManualLocation()}
                className="flex-1 h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-sm font-medium"
              />
              <button
                onClick={handleManualLocation}
                disabled={!locationInput.trim()}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  !locationInput.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-105 active:scale-95"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === "time" && selectedTime === "Custom" && (
        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Enter minutes..."
              value={customMinutes}
              onChange={(e) => {
                console.log('Custom time input changed:', e.target.value);
                setCustomMinutes(e.target.value);
              }}
              onKeyPress={(e) => e.key === "Enter" && handleCustomTimeSubmit()}
              className="flex-1 h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-sm font-medium"
              min="1"
            />
            <button
              onClick={handleCustomTimeSubmit}
              disabled={!customMinutes}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                !customMinutes
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white hover:shadow-lg hover:scale-105 active:scale-95"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
};

export default ChatBot;