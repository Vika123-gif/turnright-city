import React, { useState, useEffect, useRef } from "react";
import Button from "./Button";
import { MapPin, Clock, Shuffle, Send, ChevronUp, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

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
  component?: React.ReactNode;
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
      
      const scenarioComponent = (
        <div className="flex gap-2 mt-3">
          <Button
            onClick={() => handleScenarioSelect("onsite")}
            variant="primary"
            className="text-xs h-8"
          >
            I'm already here
          </Button>
          <Button
            onClick={() => handleScenarioSelect("planning")}
            variant="outline"
            className="text-xs h-8"
          >
            Planning
          </Button>
        </div>
      );
      
      addBotMessage("", scenarioComponent);
      setCurrentStep("scenario_fork");
    }, 1000);
  }, []);

  const addBotMessage = (content: string, component?: React.ReactNode) => {
    const message: Message = {
      id: Date.now().toString(),
      type: "bot",
      content,
      timestamp: new Date(),
      component
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
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
        
        const cityDatesComponent = (
          <div className="space-y-3 mt-3">
            <Input
              type="text"
              placeholder="Enter city name..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCitySubmit()}
              className="w-full"
            />
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OPTIONS.map((days) => (
                <Button
                  key={days}
                  variant={selectedDays === days ? "primary" : "outline"}
                  onClick={() => setSelectedDays(days)}
                  className="text-xs h-8"
                >
                  {days} day{days !== "1" ? "s" : ""}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleCitySubmit}
              disabled={!userInput.trim() || !selectedDays}
              className="text-xs h-8 w-full"
            >
              Continue
            </Button>
          </div>
        );
        
        addBotMessage("", cityDatesComponent);
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
        
        const accommodationComponent = (
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => handleAccommodationSelect(true)}
              variant="primary"
              className="text-xs h-8"
            >
              Yes, specify
            </Button>
            <Button
              onClick={() => handleAccommodationSelect(false)}
              variant="outline"
              className="text-xs h-8"
            >
              Not yet
            </Button>
          </div>
        );
        
        addBotMessage("", accommodationComponent);
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
    setCollectedData(prev => ({ ...prev, location }));
    
    setTimeout(() => {
      addBotMessage("✅ Perfect! How much time do you have for exploring?");
      showTimeComponent();
    }, 1000);
  };

  const showTimeComponent = () => {
    const timeComponent = (
      <div className="space-y-3 mt-3">
        <div className="grid grid-cols-2 gap-2">
          {TIMINGS.map((time) => (
            <Button
              key={time}
              variant={selectedTime === time ? "primary" : "outline"}
              onClick={() => handleTimeSelect(time)}
              className="text-xs h-8"
            >
              {time}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectedTime === "Custom" ? "primary" : "outline"}
            onClick={() => handleTimeSelect("Custom")}
            className="text-xs h-8"
          >
            Custom
          </Button>
          {selectedTime === "Custom" && (
            <Input
              type="number"
              placeholder="Minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="w-20 h-8 text-xs"
              min="1"
            />
          )}
        </div>
      </div>
    );

    addBotMessage("⏰", timeComponent);
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
      
      const destinationComponent = (
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button
            onClick={() => handleDestinationSelect("none")}
            variant="outline"
            className="text-xs h-8"
          >
            No
          </Button>
          <Button
            onClick={() => handleDestinationSelect("circle")}
            variant="outline"
            className="text-xs h-8"
          >
            Circle route
          </Button>
          <Button
            onClick={() => handleDestinationSelect("specific")}
            variant="outline"
            className="text-xs h-8"
          >
            Enter point B
          </Button>
        </div>
      );
      
      addBotMessage("", destinationComponent);
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
        // Show input for destination
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

  const showInterestsComponent = (step: "interests" | "trip_interests") => {
    const categoriesComponent = (
      <div className="space-y-3 mt-3">
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((category) => (
            <label key={category} className="flex items-center space-x-2 cursor-pointer text-xs">
              <Checkbox
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSurpriseMe}
            className="flex items-center gap-1 text-xs h-8"
          >
            <Shuffle className="w-3 h-3" />
            Surprise me
          </Button>
          <Button
            onClick={() => handleInterestsSubmit(step)}
            disabled={selectedCategories.length === 0}
            className="text-xs h-8"
          >
            Continue
          </Button>
        </div>
      </div>
    );

    addBotMessage("", categoriesComponent);
    setCurrentStep(step);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
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
      setCollectedData(prev => ({ ...prev, categories: selectedCategories }));
      
      setTimeout(() => {
        addBotMessage("Any additional preferences?");
        showAdditionalSettings(step === "interests" ? "additional_settings" : "trip_settings");
      }, 1000);
    }
  };

  const showAdditionalSettings = (step: "additional_settings" | "trip_settings") => {
    const settingsComponent = (
      <div className="space-y-3 mt-3">
        <div className="space-y-2">
          {ADDITIONAL_SETTINGS.map((setting) => (
            <label key={setting} className="flex items-center space-x-2 cursor-pointer text-xs">
              <Checkbox
                checked={additionalSettings.includes(setting)}
                onCheckedChange={() => handleSettingToggle(setting)}
              />
              <span>{setting}</span>
            </label>
          ))}
        </div>
        <Button
          onClick={() => handleSettingsSubmit(step)}
          className="text-xs h-8 w-full"
        >
          {selectedScenario === "planning" ? "Create Trip Plan" : "Generate Route"}
        </Button>
      </div>
    );

    addBotMessage("", settingsComponent);
    setCurrentStep(step);
  };

  const handleSettingToggle = (setting: string) => {
    setAdditionalSettings(prev => 
      prev.includes(setting) 
        ? prev.filter(s => s !== setting)
        : [...prev, setting]
    );
  };

  const handleSettingsSubmit = (step: "additional_settings" | "trip_settings") => {
    setCollectedData(prev => ({ ...prev, additionalSettings }));
    const finalData = { ...collectedData, additionalSettings };
    setCurrentStep("complete");
    
    setTimeout(() => {
      addBotMessage(`🚀 Perfect! Let me create your personalized ${selectedScenario === "planning" ? "trip plan" : "route"}...`);
      onComplete(finalData);
    }, 1000);
  };

  const handleManualLocation = () => {
    if (userInput.trim()) {
      addUserMessage(`📍 ${userInput}`);
      handleLocationSubmit(userInput);
      setUserInput("");
    }
  };

  if (!isVisible && isRouteGenerated) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggleVisibility}
          variant="primary"
          className="rounded-full w-12 h-12 shadow-lg"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-white z-40 flex flex-col ${!isVisible && isRouteGenerated ? 'hidden' : ''}`}>
      {isRouteGenerated && (
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">Chat with TurnRight</h3>
          <Button
            onClick={onToggleVisibility}
            variant="outline"
            className="text-xs h-8"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === "user"
                  ? "bg-[#008457] text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {message.content && <p className="text-sm">{message.content}</p>}
              {message.component}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {currentStep === "location" && (
        <div className="p-4 border-t bg-gray-50 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <input
              type="checkbox"
              id="locationConsent"
              checked={locationConsent}
              onChange={(e) => setLocationConsent(e.target.checked)}
              className="mt-0.5"
            />
            <label htmlFor="locationConsent" className="text-xs text-gray-700 leading-relaxed">
              I consent to sharing my location for personalized recommendations
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleDetectLocation}
              disabled={detecting || !locationConsent}
              variant="primary"
              className="flex items-center gap-2 text-xs h-8"
            >
              <MapPin className="w-4 h-4" />
              {detecting ? "Detecting..." : "Share Location"}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Or enter location manually..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleManualLocation()}
              className="flex-1"
            />
            <Button
              onClick={handleManualLocation}
              disabled={!userInput.trim()}
              className="text-xs h-8"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === "time" && selectedTime === "Custom" && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter minutes..."
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCustomTimeSubmit()}
              className="flex-1"
              min="1"
            />
            <Button
              onClick={handleCustomTimeSubmit}
              disabled={!customMinutes}
              className="text-xs h-8"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;