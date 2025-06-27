
import React, { useState } from "react";
import Button from "../Button";
import { Laptop, Coffee, Utensils, MapPin, Building, Trees } from "lucide-react";

const GOALS = [
  { 
    label: "🍽️ Restaurants", 
    value: "restaurants", 
    icon: <Utensils className="w-5 h-5 inline-block" />,
  },
  { 
    label: "☕ Coffee", 
    value: "coffee", 
    icon: <Coffee className="w-5 h-5 inline-block" />,
  },
  { 
    label: "💻 Work", 
    value: "work", 
    icon: <Laptop className="w-5 h-5 inline-block" />,
  },
  { 
    label: "🏛️ Museums", 
    value: "museums", 
    icon: <Building className="w-5 h-5 inline-block" />,
  },
  { 
    label: "🌳 Parks", 
    value: "parks", 
    icon: <Trees className="w-5 h-5 inline-block" />,
  },
  { 
    label: "🏰 Architectural Monuments", 
    value: "monuments", 
    icon: <MapPin className="w-5 h-5 inline-block" />,
  },
];

type Props = {
  onNext: (goals: string[]) => void;
  value: string[];
};

const GoalsStep: React.FC<Props> = ({ onNext, value }) => {
  const [selected, setSelected] = useState<string[]>(value || []);

  const toggle = (v: string) => {
    setSelected((prev) =>
      prev.includes(v)
        ? prev.filter((g) => g !== v)
        : [...prev, v]
    );
  };

  return (
    <div className="chat-card text-left">
      <div className="font-semibold text-lg mb-3 flex items-center gap-2">🎯 What do you want to do now? <span className="text-base font-normal">(You can select multiple options.)</span></div>
      
      <div className="flex flex-col gap-3">
        {GOALS.map((g) => (
          <div key={g.value} className="mb-2">
            <Button
              variant={selected.includes(g.value) ? "primary" : "outline"}
              aria-pressed={selected.includes(g.value)}
              onClick={() => {
                toggle(g.value);
              }}
              className="w-full"
            >
              <span className="inline-block mr-2">{g.icon}</span>
              {g.label}
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        className="mt-8"
        onClick={() => onNext(selected)}
        disabled={selected.length === 0}
        tabIndex={100}
      >
        Next
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
  );
};

export default GoalsStep;
