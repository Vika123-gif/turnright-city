import React, { useState } from "react";
import Button from "../Button";
import { Shuffle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useButtonTracking } from "@/hooks/useButtonTracking";

const CATEGORIES = [
  "Restaurants",
  "Cafés", 
  "Bars",
  "Viewpoints",
  "Parks",
  "Museums",
  "Architectural landmarks",
  "Coworking",
  "Bakery",
  "Specialty coffee"
];

type Props = {
  onNext: (categories: string[]) => void;
  value?: string[];
};

const CategoriesStep: React.FC<Props> = ({ onNext, value }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(value || []);
  const { trackButtonClick } = useButtonTracking();

  const handleCategoryToggle = (category: string) => {
    trackButtonClick(`category_${category}`);
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSurpriseMe = () => {
    trackButtonClick('surprise_me_categories');
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
    trackButtonClick('generate_route');
    onNext(selectedCategories);
  };

  const isFormValid = selectedCategories.length > 0;

  return (
    <div className="chat-card text-left">
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

      <Button
        onClick={handleGenerateRoute}
        disabled={!isFormValid}
        className="w-full h-12 font-semibold"
      >
        Continue
      </Button>
    </div>
  );
};

export default CategoriesStep;