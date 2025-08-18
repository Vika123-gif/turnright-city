
import React, { useState } from "react";
import Button from "../Button";
import { Clock, Shuffle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const TIMINGS = [
  "1h",
  "3h", 
  "5h",
  "Full day",
];

const TIME_TO_MINUTES = {
  "1h": 60,
  "3h": 180,
  "5h": 300,
  "Full day": 480,
};

const CATEGORIES = [
  "Restaurants",
  "Cafés", 
  "Bars",
  "Viewpoints",
  "Parks",
  "Museums",
  "Architectural landmarks",
  "Work-friendly"
];

type Props = {
  onNext: (data: { timeMinutes: number; categories: string[] }) => void;
  value?: any;
};

const TimeStep: React.FC<Props> = ({ onNext, value }) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(value?.time || null);
  const [customMinutes, setCustomMinutes] = useState<string>(value?.customMinutes || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(value?.categories || []);

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSurpriseMe = () => {
    const numCategories = Math.floor(Math.random() * 3) + 2; // 2-4 categories
    const availableCategories = [...CATEGORIES];
    const selected = [];
    
    // 50% chance to include Viewpoints
    if (Math.random() < 0.5) {
      selected.push("Viewpoints");
      availableCategories.splice(availableCategories.indexOf("Viewpoints"), 1);
    }
    
    // Fill remaining slots
    while (selected.length < numCategories && availableCategories.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCategories.length);
      selected.push(availableCategories.splice(randomIndex, 1)[0]);
    }
    
    setSelectedCategories(selected);
  };

  const handleGenerateRoute = () => {
    const timeMinutes = selectedTime === "Custom" 
      ? parseInt(customMinutes) || 0
      : TIME_TO_MINUTES[selectedTime as keyof typeof TIME_TO_MINUTES] || 0;
    
    onNext({ timeMinutes, categories: selectedCategories });
  };

  const isFormValid = (selectedTime && selectedCategories.length > 0) && 
    (selectedTime !== "Custom" || customMinutes);

  return (
    <div className="chat-card text-left">
      {/* Time Selection */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6" />
          <span className="font-semibold text-lg">How much time do you have?</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {TIMINGS.map((time) => (
            <Button
              key={time}
              variant={selectedTime === time ? "primary" : "outline"}
              onClick={() => handleTimeSelect(time)}
              className="h-12"
            >
              {time}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={selectedTime === "Custom" ? "primary" : "outline"}
            onClick={() => handleTimeSelect("Custom")}
            className="min-w-[120px]"
          >
            Custom (min)
          </Button>
          {selectedTime === "Custom" && (
            <Input
              type="number"
              placeholder="Minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="flex-1"
              min="1"
            />
          )}
        </div>
      </div>

      {/* Categories Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-lg">What interests you?</span>
          <Button
            variant="outline"
            onClick={handleSurpriseMe}
            className="flex items-center gap-2 text-sm px-3 py-1"
          >
            <Shuffle className="w-4 h-4" />
            Surprise me
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((category) => (
            <label key={category} className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <span className="text-sm">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Generate Route Button */}
      <Button
        onClick={handleGenerateRoute}
        disabled={!isFormValid}
        className="w-full h-12 font-semibold"
      >
        Generate route
      </Button>

      {/* MVP Link */}
      <div className="border-t pt-4 mt-6 text-center">
        <p className="text-sm text-gray-600 mb-2">
          Save for the next generations!
        </p>
        <a
          href="https://turnright.city/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#008457] underline font-medium text-sm hover:text-[#00BC72] transition-colors"
        >
          Visit TurnRight.city
        </a>
      </div>
    </div>
  )
}

export { TIME_TO_MINUTES };
export default TimeStep;
