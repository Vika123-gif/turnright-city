import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useButtonTracking } from "@/hooks/useButtonTracking";

type Props = {
  onNext: (preferences: string[]) => void;
  value?: string[];
};

const ROUTE_PREFERENCES = [
  {
    group: "Vibe & Atmosphere",
    options: [
      "Cozy & quiet (calmer streets with fewer people, no loud traffic)",
      "Scenic & beautiful (perfect for your Instagram: views, panoramas, photogenic spots)",
      "Hidden local gems (see the city through locals' eyes, only authentic places)",
      "Lively & popular (busy streets, famous spots, lots of energy)"
    ]
  },
  {
    group: "Comfort & Safety",
    options: [
      "Mobility-friendly (easier paths, no steep hills or stairs)",
      "Safety-first (safer, well-lit, comfortable zones)"
    ]
  }
];

const RoutePreferencesStep: React.FC<Props> = ({ onNext, value = [] }) => {
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(value);
  const { trackButtonClick } = useButtonTracking();

  const handlePreferenceToggle = (preference: string) => {
    trackButtonClick(`route_preference_${preference.split(' ')[0]}`);
    setSelectedPreferences(prev => 
      prev.includes(preference) 
        ? prev.filter(p => p !== preference)
        : [...prev, preference]
    );
  };

  const handleSkip = () => {
    trackButtonClick('route_preferences_skip');
    onNext([]);
  };

  const handleContinue = () => {
    trackButtonClick('route_preferences_continue');
    onNext(selectedPreferences);
  };

  return (
    <div className="chat-card text-left">
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-2">What kind of route do you prefer?</h3>
        <p className="text-sm text-gray-500 mb-4">Select as many options as you like</p>
        
        {ROUTE_PREFERENCES.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            <h4 className="font-medium text-sm text-gray-700 mb-3">{group.group}</h4>
            <div className="space-y-2">
              {group.options.map((option, optionIndex) => (
                <label 
                  key={optionIndex} 
                  className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all ${
                    selectedPreferences.includes(option)
                      ? "bg-blue-50 border-2 border-blue-200"
                      : "hover:bg-gray-50 border-2 border-transparent"
                  }`}
                >
                  <Checkbox
                    checked={selectedPreferences.includes(option)}
                    onCheckedChange={() => handlePreferenceToggle(option)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-700 flex-1">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Button
          onClick={handleContinue}
          className="w-full h-12 font-semibold"
          disabled={selectedPreferences.length === 0}
        >
          {selectedPreferences.length > 0 
            ? `Continue (${selectedPreferences.length} selected)`
            : "Continue"
          }
        </Button>
        <Button
          onClick={handleSkip}
          variant="outline"
          className="w-full h-12 font-semibold"
        >
          Skip - I don't have any preferences
        </Button>
      </div>
    </div>
  );
};

export default RoutePreferencesStep;

