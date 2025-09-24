
import React, { useState } from "react";
import Button from "../Button";

const TIMINGS = ["3h", "6h", "Half-day", "Day"];
const TIME_TO_MINUTES = { "3h": 180, "6h": 360, "Half-day": 240, "Day": 480 };

type Props = {
  onNext: (timeMinutes: number) => void;
  value?: number;
};

const TimeStep: React.FC<Props> = ({ onNext, value }) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(
    value ? Object.keys(TIME_TO_MINUTES).find(key => TIME_TO_MINUTES[key as keyof typeof TIME_TO_MINUTES] === value) || "Custom" : null
  );
  const [customMinutes, setCustomMinutes] = useState(
    value && !Object.values(TIME_TO_MINUTES).includes(value) ? value.toString() : ""
  );

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (time !== "Custom") {
      const timeMinutes = TIME_TO_MINUTES[time as keyof typeof TIME_TO_MINUTES];
      onNext(timeMinutes);
    }
  };

  const handleCustomTimeSubmit = () => {
    if (customMinutes) {
      const timeMinutes = parseInt(customMinutes);
      onNext(timeMinutes);
    }
  };

  const isFormValid = selectedTime && (selectedTime !== "Custom" || customMinutes);

  return (
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
          onClick={() => setSelectedTime("Custom")}
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
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-sm font-medium"
            min="1"
          />
        )}
      </div>
      {selectedTime === "Custom" && (
        <Button
          onClick={handleCustomTimeSubmit}
          disabled={!customMinutes}
          className="w-full h-12 font-semibold"
        >
          Continue
        </Button>
      )}
    </div>
  );
};

export default TimeStep;
