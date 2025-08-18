
import React, { useState } from "react";
import Button from "../Button";
import { Clock } from "lucide-react";
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

type Props = {
  onNext: (timeMinutes: number) => void;
  value?: any;
};

const TimeStep: React.FC<Props> = ({ onNext, value }) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(value?.time || null);
  const [customMinutes, setCustomMinutes] = useState<string>(value?.customMinutes || "");

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleNext = () => {
    const timeMinutes = selectedTime === "Custom" 
      ? parseInt(customMinutes) || 0
      : TIME_TO_MINUTES[selectedTime as keyof typeof TIME_TO_MINUTES] || 0;
    
    onNext(timeMinutes);
  };

  const isFormValid = selectedTime && (selectedTime !== "Custom" || customMinutes);

  return (
    <div className="chat-card text-left">
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

      <Button
        onClick={handleNext}
        disabled={!isFormValid}
        className="w-full h-12 font-semibold"
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
  )
}

export { TIME_TO_MINUTES };
export default TimeStep;
